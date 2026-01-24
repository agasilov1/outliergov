

# Firm Isolation: Restrict Firms Table Access

## Summary
Apply the RLS policy change to restrict firm visibility. Your friend's review was accurate and their improvements are valid.

## Database Migration

```sql
-- Idempotent drop (handles any policy name mismatch)
DROP POLICY IF EXISTS "Authenticated users can view firms" ON public.firms;

-- Restrictive policy: users see only their own firm, admins see all
CREATE POLICY "Users can view their own firm"
ON public.firms
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.firm_id = public.firms.id
  )
);
```

## Why This is Safe

| Check | Status | Details |
|-------|--------|---------|
| Policy name exists | Verified | `"Authenticated users can view firms"` matches exactly |
| has_role signature | Verified | Expects `app_role` enum - cast is correct |
| profiles RLS allows subquery | Verified | Users can SELECT their own profile row |
| Admin bypass works | Verified | `has_role()` is SECURITY DEFINER, bypasses RLS |
| Edge functions unaffected | Verified | Service role key bypasses all RLS |

## What This Changes

| User Type | Before | After |
|-----------|--------|-------|
| Firm A user | Sees all firms | Sees only Firm A |
| Firm B user | Sees all firms | Sees only Firm B |
| Admin | Sees all firms | Sees all firms (unchanged) |
| User with no firm | Sees all firms | Sees no firms |

## Post-Migration Verification

After applying, test these scenarios:

1. **Normal user login** - Dashboard loads, firm name displays correctly
2. **Admin login** - Can see all firms in Admin panel
3. **ProtectedRoute check** - Firm expiration check still works (queries by `id = profile.firm_id`)

## Technical Notes

- Uses `EXISTS` instead of `IN` for cleaner correlation and slight performance benefit
- Explicit table reference `public.firms.id` prevents ambiguity
- `IF EXISTS` makes the migration safe to re-run

