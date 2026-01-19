import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

// Redact email for logs and responses: "goon@goon.com" -> "g***@goon.com"
function redactEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  const redactedLocal = local.length > 1 ? local[0] + '***' : '***';
  return `${redactedLocal}@${domain}`;
}

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
        JSON.stringify({ success: false, error: 'Authorization header required' }),
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
        JSON.stringify({ success: false, error: 'Unauthorized' }),
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
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { firm_id, confirm_name } = await req.json();

    if (!firm_id || !confirm_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'firm_id and confirm_name are required' }),
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
        JSON.stringify({ success: false, error: 'Firm not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify confirm_name matches exactly
    if (firm.name !== confirm_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Confirmation name does not match firm name' }),
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
        JSON.stringify({ success: false, error: 'Failed to fetch firm users', step: 'fetch_users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firmUserIds = (firmUsers || []).map(u => u.id);

    // PREFLIGHT CHECKS

    // Check if caller is in the firm (cannot delete your own account)
    if (firmUserIds.includes(user.id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete firm containing your own account' }),
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
          JSON.stringify({ success: false, error: 'Cannot delete firm: contains admin user(s)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // DELETE USERS - PUBLIC DATA FIRST, THEN AUTH, FAIL FAST
    const deletedUserIds: string[] = [];

    for (const firmUser of firmUsers || []) {
      const redacted = redactEmail(firmUser.email);
      
      try {
        console.log(`[delete-firm] Processing user: ${redacted} (${firmUser.id})`);
        
        // STEP 1: Delete public data first (terms_acceptances, user_roles, profiles)
        
        // 1a. Delete from terms_acceptances
        const { error: termsError } = await adminClient
          .from('terms_acceptances')
          .delete()
          .eq('user_id', firmUser.id);
        if (termsError) {
          console.error(`[delete-firm] Terms delete failed for ${redacted}:`, termsError.message);
          throw { step: 'terms_delete', message: `Terms deletion failed: ${termsError.message}` };
        }

        // 1b. Delete from user_roles
        const { error: rolesError } = await adminClient
          .from('user_roles')
          .delete()
          .eq('user_id', firmUser.id);
        if (rolesError) {
          console.error(`[delete-firm] Roles delete failed for ${redacted}:`, rolesError.message);
          throw { step: 'roles_delete', message: `Roles deletion failed: ${rolesError.message}` };
        }

        // 1c. Delete from profiles
        const { error: profilesError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', firmUser.id);
        if (profilesError) {
          console.error(`[delete-firm] Profile delete failed for ${redacted}:`, profilesError.message);
          throw { step: 'profile_delete', message: `Profile deletion failed: ${profilesError.message}` };
        }

        console.log(`[delete-firm] Public data deleted for ${redacted}`);

        // STEP 2: Check if auth user exists (strict check)
        const { data: existingUser, error: getUserError } = await adminClient.auth.admin.getUserById(firmUser.id);
        
        if (getUserError) {
          // Check if it's specifically a "not found" error
          const errorMsg = getUserError.message?.toLowerCase() || '';
          const isNotFound = errorMsg.includes('not found') || 
                            errorMsg.includes('user not found') ||
                            errorMsg.includes('no user found');
          
          if (isNotFound) {
            console.log(`[delete-firm] Auth user ${firmUser.id} not found (already deleted), skipping auth delete`);
            // Continue - user doesn't exist in auth, that's fine
          } else {
            // Generic error - DO NOT skip, this could mask an outage
            console.error(`[delete-firm] Auth check failed for ${redacted}: ${getUserError.message}`);
            throw { step: 'auth_check', message: `Failed to verify auth user: ${getUserError.message}` };
          }
        } else if (!existingUser?.user) {
          // User is null - treat as not found
          console.log(`[delete-firm] Auth user ${firmUser.id} returned null, skipping auth delete`);
        } else {
          // Auth user exists - proceed with deletion
          console.log(`[delete-firm] Auth user exists, attempting hard delete for ${redacted}`);
          
          const { error: hardDeleteError } = await adminClient.auth.admin.deleteUser(firmUser.id);
          
          if (hardDeleteError) {
            console.error(`[delete-firm] Hard delete failed for ${redacted}: ${hardDeleteError.message}`);
            
            // Try soft delete as fallback
            console.log(`[delete-firm] Attempting soft delete fallback for ${redacted}`);
            const { error: softDeleteError } = await adminClient.auth.admin.deleteUser(firmUser.id, true);
            
            if (softDeleteError) {
              console.error(`[delete-firm] Soft delete also failed for ${redacted}: ${softDeleteError.message}`);
              throw { step: 'auth_delete', message: `Auth deletion failed (hard: ${hardDeleteError.message}, soft: ${softDeleteError.message})` };
            } else {
              console.log(`[delete-firm] Soft delete succeeded for ${redacted}`);
            }
          } else {
            console.log(`[delete-firm] Auth user hard deleted: ${redacted}`);
          }
        }

        deletedUserIds.push(firmUser.id);
        console.log(`[delete-firm] User fully deleted: ${redacted}`);
        
      } catch (err) {
        // FAIL FAST - stop immediately, do NOT delete firm
        const step = (err as { step?: string })?.step || 'user_deletion';
        const errorMessage = (err as { message?: string })?.message || 
                            (err instanceof Error ? err.message : 'Unknown error');
        
        console.error(`[delete-firm] FAILURE for ${redacted} at step ${step}:`, errorMessage);

        // Try to log failure (non-fatal) - use redacted email in audit
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
              step,
              error: errorMessage
              // No raw email stored
            }
          });
        } catch (auditErr) {
          console.error('Audit log failed (non-fatal):', auditErr);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to delete user at step "${step}": ${errorMessage}`,
            step,
            deletedUserIds,
            failedUserId: firmUser.id,
            failedUserEmailRedacted: redacted,
            firmDeleted: false
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          step: 'firm_delete',
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
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
