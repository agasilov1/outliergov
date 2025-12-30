import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get token from query params or body
    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    
    if (!token && req.method === 'POST') {
      const body = await req.json();
      token = body.token;
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invitation token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up the invitation
    const { data: invitation, error: lookupError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (lookupError || !invitation) {
      console.log('Invalid token:', token);
      return new Response(
        JSON.stringify({ error: 'Invalid invitation link' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ error: 'This invitation has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a magic link for the user
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
      options: {
        redirectTo: `${req.headers.get('origin') || Deno.env.get('SITE_URL') || 'http://localhost:5173'}/`
      }
    });

    if (magicLinkError) {
      console.error('Error generating magic link:', magicLinkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create authentication link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID from the generated link data
    const newUserId = magicLinkData.user?.id;

    if (!newUserId) {
      console.error('No user ID returned from magic link generation');
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign the role from the invitation
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: invitation.role
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Continue anyway - user is created, role can be assigned manually
    }

    // Update profile with firm_id if provided
    if (invitation.firm_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ firm_id: invitation.firm_id })
        .eq('id', newUserId);
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: newUserId
      })
      .eq('id', invitation.id);

    // Log to audit_log
    await supabaseAdmin.from('audit_log').insert({
      user_id: newUserId,
      action: 'invite_accepted',
      entity_type: 'invitation',
      entity_id: invitation.id,
      metadata: { email: invitation.email, role: invitation.role }
    });

    console.log('Invitation accepted successfully:', { 
      email: invitation.email, 
      role: invitation.role, 
      userId: newUserId 
    });

    // Extract the token from the magic link URL for client-side auth
    const actionLink = magicLinkData.properties?.action_link;
    
    return new Response(
      JSON.stringify({
        success: true,
        email: invitation.email,
        role: invitation.role,
        action_link: actionLink,
        message: 'Invitation accepted. Please use the magic link to sign in.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
