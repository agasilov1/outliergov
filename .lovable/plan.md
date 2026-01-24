

## Security Hardening: Safe Code Changes Only

### Scope: Only Low-Risk, Concrete Fixes

Based on expert review, this plan includes ONLY:
- HTTP method enforcement on admin edge functions
- Server-side protection for admin/protected user deletion

**Explicitly NOT included** (require manual work or dashboard config):
- Rate limiting (no Redis/KV infrastructure exists)
- RLS policy changes (risk of breaking user flows)
- Database constraint changes (could break system actions)
- Dashboard settings (leaked password protection, auth rate limits)

---

### Change 1: HTTP Method Enforcement on Admin Functions

**Why it's safe:** The Admin UI already uses POST for all function calls. This only rejects unexpected GET/PUT/DELETE requests that shouldn't happen anyway.

**Files to modify:**

| File | Change |
|------|--------|
| `supabase/functions/list-users/index.ts` | Add POST-only check |
| `supabase/functions/create-user/index.ts` | Add POST-only check |
| `supabase/functions/delete-user/index.ts` | Add POST-only check |
| `supabase/functions/generate-invite/index.ts` | Add POST-only check |
| `supabase/functions/delete-firm-with-users/index.ts` | Add POST-only check |

**Code pattern** (add after CORS preflight handling):
```typescript
// Reject non-POST requests
if (req.method !== 'POST') {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

### Change 2: Server-Side Admin Deletion Protection

**Why it's safe:** Only affects the delete-user endpoint. Normal user deletions continue working. Prevents accidental deletion of the sole admin account.

**File:** `supabase/functions/delete-user/index.ts`

**Add after the self-deletion check (around line 80):**
```typescript
// Prevent deleting admin users
const { data: targetRoles } = await adminClient
  .from('user_roles')
  .select('role')
  .eq('user_id', user_id);

const targetIsAdmin = targetRoles?.some(r => r.role === 'admin');
if (targetIsAdmin) {
  return new Response(
    JSON.stringify({ error: 'Cannot delete admin users' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Protect specific email (server-side enforcement)
const { data: targetUser } = await adminClient.auth.admin.getUserById(user_id);
const protectedEmails = ['arifgasilov123@gmail.com'];
if (targetUser?.user?.email && 
    protectedEmails.includes(targetUser.user.email.toLowerCase())) {
  return new Response(
    JSON.stringify({ error: 'This account is protected' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

### What You Should Do Manually (Not in This Plan)

| Item | Where | Notes |
|------|-------|-------|
| Enable Leaked Password Protection | Supabase Dashboard → Auth → Policies | Safe, may reject weak passwords |
| Enable Auth Rate Limits | Supabase Dashboard → Auth → Rate Limits | Start with generous limits (100/hour) |
| Review RLS on `firms` table | SQL Editor / Migration | Test in dev environment first |
| Centralize password validation | Future refactor | Low priority, cosmetic consistency |

---

### Summary

This plan makes **2 surgical changes** that:
- Cannot break existing user flows (Admin UI already uses POST)
- Protect the sole admin account from accidental deletion
- Add zero new dependencies or infrastructure

Total files modified: 6 edge functions

