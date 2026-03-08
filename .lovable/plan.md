

## Plan: Fix RLS Policy Role Scoping

### Problem
7 tables have SELECT policies that claim to require authentication but actually use `roles:{public}` (the Postgres public role), meaning **unauthenticated API requests with just the anon key can read data without logging in**. This exposes the core product data (anomaly flags, provider attributes, peer stats) to anyone who knows the project URL.

### Fix
One migration to update all affected policies from `roles:{public}` to `roles:{authenticated}`:

**Tables to fix (change SELECT policy role from `public` to `authenticated`):**
1. `provider_attributes` — "Authenticated users can view provider attributes"
2. `peer_group_stats` — "Authenticated users can view peer group stats"
3. `peer_group_definitions` — "Authenticated users can view peer group definitions"
4. `specialty_map` — "Authenticated users can view specialty map"
5. `anomaly_flags_v2` — "Authenticated users can view flagged anomalies"
6. `anomaly_flag_years` — "Authenticated users can view anomaly flag years"
7. `dataset_releases` — "Authenticated users can view active releases"

**Also fix INSERT/SELECT/DELETE role on:**
8. `terms_acceptances` — 2 policies (INSERT + SELECT for own)
9. `watchlist_items` — 3 policies (INSERT + SELECT + DELETE for own)

**Implementation**: For each policy, `DROP POLICY` then `CREATE POLICY` with identical name, command, USING/WITH CHECK expressions, but `TO authenticated` instead of `TO public`.

### What this does NOT change
- Admin ALL policies (functionally safe since `has_role()` returns false for anon)
- `anomaly_flags` table (already uses `roles:{authenticated}`)
- `providers` table (already uses `roles:{authenticated}`)
- Any USING/WITH CHECK expressions — logic stays identical

### Files modified
- One database migration (SQL only, no code changes needed)

