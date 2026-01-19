import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightSafe(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // SECURITY: Only accept POST requests to prevent token leakage in URLs/logs
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST with token in body.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // SECURITY: Only accept token from POST body - never from URL query params
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invitation token is required in request body' }),
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
      
      // If user already exists, send magic link via email instead of returning it
      if (inviteError.message?.includes('already been registered')) {
        // Send magic link via email (OTP flow) - do NOT return the link
        const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
          email: invitation.email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${origin}/`
          }
        });

        if (otpError) {
          console.error('Error sending magic link email:', otpError);
          return new Response(
            JSON.stringify({ error: 'Failed to send authentication email' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user ID for role assignment
        const { data: existingUserData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUserData?.users?.find(u => u.email === invitation.email);
        
        if (existingUser) {
          // Assign role
          await supabaseAdmin.from('user_roles').upsert({
            user_id: existingUser.id,
            role: invitation.role
          }, { onConflict: 'user_id,role' });

          // Update profile with firm_id
          if (invitation.firm_id) {
            await supabaseAdmin.from('profiles').update({ firm_id: invitation.firm_id }).eq('id', existingUser.id);
          }

          // Mark invitation as accepted
          await supabaseAdmin.from('invitations').update({
            accepted_at: new Date().toISOString(),
            accepted_by: existingUser.id
          }).eq('id', invitation.id);
        }

        // Return success WITHOUT the magic link - user must check email
        return new Response(
          JSON.stringify({
            success: true,
            email: invitation.email,
            role: invitation.role,
            email_sent: true,
            message: 'A sign-in link has been sent to your email. Please check your inbox.'
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
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
