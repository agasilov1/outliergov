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

    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'http://localhost:5173';

    // Use inviteUserByEmail to send a password setup email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invitation.email,
      {
        redirectTo: `${origin}/auth/callback`
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      
      // If user already exists, generate a magic link instead
      if (inviteError.message?.includes('already been registered')) {
        const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: invitation.email,
          options: {
            redirectTo: `${origin}/`
          }
        });

        if (magicLinkError) {
          return new Response(
            JSON.stringify({ error: 'Failed to create authentication link' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user ID
        const newUserId = magicLinkData.user?.id;
        if (newUserId) {
          // Assign role
          await supabaseAdmin.from('user_roles').upsert({
            user_id: newUserId,
            role: invitation.role
          }, { onConflict: 'user_id,role' });

          // Update profile with firm_id
          if (invitation.firm_id) {
            await supabaseAdmin.from('profiles').update({ firm_id: invitation.firm_id }).eq('id', newUserId);
          }

          // Mark invitation as accepted
          await supabaseAdmin.from('invitations').update({
            accepted_at: new Date().toISOString(),
            accepted_by: newUserId
          }).eq('id', invitation.id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            email: invitation.email,
            role: invitation.role,
            action_link: magicLinkData.properties?.action_link,
            message: 'User already exists. Signing you in...'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create user invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID from invite data
    const newUserId = inviteData.user?.id;

    if (newUserId) {
      // Assign the role from the invitation
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUserId,
          role: invitation.role
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      }

      // Create or update profile with firm_id if provided
      const profileData: { id: string; email: string; firm_id?: string } = {
        id: newUserId,
        email: invitation.email
      };
      
      if (invitation.firm_id) {
        profileData.firm_id = invitation.firm_id;
      }

      await supabaseAdmin.from('profiles').upsert(profileData, { onConflict: 'id' });

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
    }

    console.log('Invitation accepted, email sent to:', invitation.email);

    return new Response(
      JSON.stringify({
        success: true,
        email: invitation.email,
        role: invitation.role,
        email_sent: true,
        message: 'Invitation accepted! Check your email to set your password and complete signup.'
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
