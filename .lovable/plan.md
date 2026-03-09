

## Fix: Create User Edge Function Crash

### Root Cause
Two issues:

1. **Invalid `listUsers` call** (line 130): `supabaseAdmin.auth.admin.listUsers({ filter: { email } })` is not valid Supabase API. The `listUsers` method only accepts `{ page, perPage }`. This throws an unhandled exception, crashing the function silently (only "booted" appears in logs).

2. **Client error handling** (line 198 of Admin.tsx): When the edge function returns a non-2xx status, `supabase.functions.invoke` puts the parsed body into `error`, not `data`. So `data?.error` is always undefined on failure, producing the generic "Failed to create user" message.

### Fix

**File: `supabase/functions/create-user/index.ts`**
- Remove the `listUsers` duplicate-check block (lines 129-138)
- Instead, let `createUser` fail naturally and check for the "already registered" error in the existing error handler (around line 155)

**File: `src/pages/Admin.tsx`**
- Improve error extraction on line 198 to handle the case where the error comes back from `supabase.functions.invoke` as a `FunctionsHttpError` with a JSON body

### No database changes needed

