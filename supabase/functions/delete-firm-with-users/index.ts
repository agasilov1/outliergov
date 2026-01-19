import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightSafe(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get caller's user info
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin (using maybeSingle for robustness)
    const { data: adminCheck } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { firm_id, confirm_name } = await req.json();

    if (!firm_id || !confirm_name) {
      return new Response(
        JSON.stringify({ error: 'firm_id and confirm_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch firm and verify it exists
    const { data: firm, error: firmFetchError } = await adminClient
      .from('firms')
      .select('id, name')
      .eq('id', firm_id)
      .maybeSingle();

    if (firmFetchError || !firm) {
      return new Response(
        JSON.stringify({ error: 'Firm not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify confirm_name matches exactly
    if (firm.name !== confirm_name) {
      return new Response(
        JSON.stringify({ error: 'Confirmation name does not match firm name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all users in this firm (fresh query)
    const { data: firmUsers, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('firm_id', firm_id);

    if (usersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch firm users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firmUserIds = (firmUsers || []).map(u => u.id);

    // PREFLIGHT CHECKS

    // Check if caller is in the firm (cannot delete your own account)
    if (firmUserIds.includes(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete firm containing your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if any firm user is an admin (batch query)
    if (firmUserIds.length > 0) {
      const { data: adminUsers } = await adminClient
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .in('user_id', firmUserIds);

      if (adminUsers && adminUsers.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete firm: contains admin user(s)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // DELETE USERS - AUTH FIRST, FAIL FAST
    const deletedUserIds: string[] = [];

    for (const firmUser of firmUsers || []) {
      try {
        // 1. DELETE AUTH USER FIRST (most likely to fail)
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(firmUser.id);
        if (authDeleteError) throw authDeleteError;

        // 2. Delete profile row (only after auth succeeded)
        await adminClient.from('profiles').delete().eq('id', firmUser.id);

        // 3. Delete user_roles rows
        await adminClient.from('user_roles').delete().eq('user_id', firmUser.id);

        // 4. Delete terms_acceptances rows (cleanup)
        await adminClient.from('terms_acceptances').delete().eq('user_id', firmUser.id);

        deletedUserIds.push(firmUser.id);
      } catch (err) {
        // FAIL FAST - stop immediately, do NOT delete firm
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        // Try to log failure (non-fatal)
        try {
          await adminClient.from('audit_log').insert({
            user_id: user.id,
            action: 'delete_firm_partial_failure',
            entity_type: 'firm',
            entity_id: firm_id,
            metadata: {
              firm_name: firm.name,
              deleted_user_ids: deletedUserIds,
              failed_user_id: firmUser.id,
              failed_user_email: firmUser.email,
              error: errorMessage
            }
          });
        } catch (auditErr) {
          console.error('Audit log failed (non-fatal):', auditErr);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to delete user ${firmUser.email}: ${errorMessage}`,
            deletedUserIds,
            failedUserId: firmUser.id,
            firmDeleted: false
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // All users deleted successfully - now delete firm
    const { error: firmDeleteError } = await adminClient
      .from('firms')
      .delete()
      .eq('id', firm_id);

    if (firmDeleteError) {
      // Try to log this edge case (non-fatal)
      try {
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'delete_firm_users_only',
          entity_type: 'firm',
          entity_id: firm_id,
          metadata: {
            firm_name: firm.name,
            deleted_user_count: deletedUserIds.length,
            deleted_user_ids: deletedUserIds,
            firm_delete_error: firmDeleteError.message
          }
        });
      } catch (auditErr) {
        console.error('Audit log failed (non-fatal):', auditErr);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Users deleted but firm deletion failed: ' + firmDeleteError.message,
          deletedUserIds,
          firmDeleted: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to log success (non-fatal)
    try {
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'delete_firm_with_users',
        entity_type: 'firm',
        entity_id: firm_id,
        metadata: {
          firm_name: firm.name,
          deleted_user_count: deletedUserIds.length,
          deleted_user_ids: deletedUserIds
        }
      });
    } catch (auditErr) {
      console.error('Audit log failed (non-fatal):', auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedUserIds,
        deletedUserCount: deletedUserIds.length,
        firmDeleted: true,
        firmName: firm.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
