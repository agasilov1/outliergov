import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightSafe(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token for RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create user client to verify the caller is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is an admin
    const { data: roles, error: rolesError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    if (rolesError) {
      console.error('Failed to get roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error('User is not an admin:', caller.id);
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${caller.email} deleting user ${user_id}`);

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete the profile first (cascade should handle related records)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', user_id);

    if (profileError) {
      console.error('Failed to delete profile:', profileError);
      // Continue anyway - profile might not exist
    }

    // Delete user roles
    const { error: rolesDeleteError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    if (rolesDeleteError) {
      console.error('Failed to delete user roles:', rolesDeleteError);
      // Continue anyway
    }

    // Delete the auth user
    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error('Failed to delete auth user:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from auth' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await adminClient.from('audit_log').insert({
      user_id: caller.id,
      action: 'delete_user',
      entity_type: 'user',
      entity_id: user_id,
      metadata: { deleted_by: caller.email }
    });

    console.log(`Successfully deleted user ${user_id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
