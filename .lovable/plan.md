

## Plan: Fix Create User + Update Email References

### 1. Add `https://outliergov.com` to CORS allowlist
**File: `supabase/functions/_shared/cors.ts`**

The auth logs show the user is browsing from `https://outliergov.com/` but this origin is NOT in the CORS allowlist. The browser silently blocks the response, causing "Failed to create user" on every attempt regardless of what the edge function does.

Add `'https://outliergov.com'` and `'https://www.outliergov.com'` to the `ALLOWED_ORIGINS` array.

### 2. Replace all `arif@gasilov.com` → `arif@outliergov.com`

**Files to update:**
- `src/components/SEOLandingPage.tsx` — mailto links and display text (lines 133, 139)
- `src/pages/Index.tsx` — structured data email, mailto links, display text (lines 50, 110, 117)

### 3. Replace protected admin email `arifgasilov123@gmail.com` → `arif@outliergov.com`

**Files to update:**
- `src/pages/Admin.tsx` — `PROTECTED_ADMIN_EMAIL` constant (line 68)
- `supabase/functions/delete-user/index.ts` — `protectedEmails` array (line 111)

### 4. Redeploy edge functions
Redeploy `create-user` and `delete-user` to pick up the CORS and email changes.

