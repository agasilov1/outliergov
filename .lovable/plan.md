

## Database Triggers & Functions Audit — Confirmed

The previous finding is **confirmed**: there are zero triggers in the database. Two functions (`handle_new_user` and `update_updated_at_column`) are orphaned.

## Edge Function Audit

| Function | Issue | Severity | Details |
|---|---|---|---|
| **create-user** | Profile update assumes trigger created row | **High** | Line 164: does `.update()` on profiles for the new user, but comments say "profile trigger should have created basic profile" (line 176). Since `handle_new_user` trigger is NOT wired, the profile row doesn't exist. The `.update()` silently matches zero rows — no profile is created. User ends up with a role but no profile row. |
| **create-user** | `listUsers()` fetches ALL users to check duplicates | **Medium** | Line 130: `listUsers()` returns max 1000 users by default. If >1000 users exist, duplicate check may miss existing users, allowing double-creation. |
| **generate-invite** | Same `listUsers()` pagination issue | **Medium** | Line 96: same pattern — `listUsers()` to check if user exists. Will miss users beyond the 1000 default limit. |
| **ingest-provider-metrics** | References non-existent RPC `batch_upsert_metrics` | **Medium** | Line 394: calls `supabase.rpc('batch_upsert_metrics', ...)`. This function does not exist in the database. The code has a fallback (line 400) that catches the "function not found" error and falls back to individual upserts, so it works but is wasteful — every batch triggers an error + N individual queries instead of 1. |
| **ingest-provider-metrics** | `audit_log` insert missing `user_id` | **Low** | Line 484: inserts into `audit_log` without `user_id` field. The column is nullable so it won't fail, but the RLS policy `auth.uid() = user_id` on INSERT means this insert will be rejected by RLS. However, since the function uses the service role key, RLS is bypassed — so functionally OK but semantically inconsistent. |
| **accept-invite** | No auth required — public endpoint | **Low** | The function accepts POST with a token in the body and has no Authorization header check. This is by design (invite acceptance is pre-auth), but the token is the only guard. Token is 32 random bytes (hex), so brute force is infeasible. Acceptable. |
| **CORS (all functions)** | Missing `x-supabase-client-platform` headers | **Medium** | The shared `cors.ts` allows headers: `authorization, x-client-info, apikey, content-type, x-ingest-token`. Missing: `x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`. The Supabase JS client sends these headers automatically. If the browser enforces preflight strictly, requests from the Supabase client could be blocked. |
| **delete-user** | Admin check uses user's own RLS-scoped client | **Low** | Line 51: queries `user_roles` using `userClient` (anon key + user JWT). The RLS policy on `user_roles` allows users to view their own roles, so this works. But if the RLS policy changed, this would break. Other functions use `has_role` RPC via admin client — more robust. |
| **batch-upsert-registry** | No CORS handling | **Info** | By design — comment says "NO CORS - this endpoint is not for browser use". Correct for server-to-server ingestion endpoints. |
| **batch-upsert-provider-year** | No CORS handling | **Info** | Same as above — by design for server-to-server use. |
| **seed-synthetic-data** | Inserts into `provider_yearly_metrics` (old schema) with wrong columns | **Medium** | Line 376: inserts `dataset_release_id` into `provider_yearly_metrics`, but the actual table schema for `provider_year_metrics` (note: different table name) has columns like `npi`, `tot_benes`, `tot_allowed_cents` etc. The function targets `provider_yearly_metrics` which has `provider_id` and `dataset_release_id` — this is correct for that table. No mismatch. |

### Summary of Action Items

**Must fix (High):**
1. **Wire `handle_new_user` trigger** to `auth.users` AFTER INSERT, OR change `create-user` to do `.upsert()` instead of `.update()` on profiles so the row is created if missing.

**Should fix (Medium):**
2. **CORS headers**: Add `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version` to the shared `cors.ts` `Access-Control-Allow-Headers`.
3. **`listUsers()` pagination**: In `create-user` and `generate-invite`, use `getUserByEmail()` or paginate instead of `listUsers()` which caps at 1000.
4. **`ingest-provider-metrics`**: Remove the dead `batch_upsert_metrics` RPC call and just use the fallback upsert logic directly, avoiding the wasted error/retry on every batch.

**Nice to fix (Low):**
5. Wire `update_updated_at_column` trigger to `profiles` and `firms` tables.
6. Standardize admin role check pattern across all functions (use `has_role` RPC consistently).

