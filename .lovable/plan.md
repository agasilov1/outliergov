

## Plan: Remove Login Gate, New Terms, About Section, SEO Updates

### 1. Database: Add Public Read Access (Migration)

Add `anon` SELECT policies to allow unauthenticated browsing:

- **`outlier_registry`**: Add policy `"Public can view outlier_registry"` for `anon` role, SELECT, `USING (true)`
- **`provider_year_metrics`**: Add policy `"Public can view provider_year_metrics"` for `anon` role, SELECT, `USING (true)`

These tables contain only public CMS data. Watchlist, profiles, admin tables remain auth-only.

### 2. Remove ProtectedRoute from Dashboard and Provider Routes (`src/App.tsx`)

Change `/dashboard`, `/provider/:id`, `/methodology`, `/data-sources`, `/compare` routes to render without `ProtectedRoute`. Keep `ProtectedRoute` only on `/admin`.

Wrap these pages in `AppLayout` still but without ProtectedRoute.

### 3. Make AppLayout Work Without Auth (`src/components/AppLayout.tsx`)

- Show sign-in link instead of email/sign-out when `user` is null
- Hide admin nav when not authenticated
- Gracefully handle no user state

### 4. Make Dashboard Work Without Auth (`src/pages/Dashboard.tsx`)

- Remove the "Welcome back" user info card (or show it only when logged in)
- Hide watchlist toggle when not logged in
- Show "Sign in to save watchlists" prompt when unauthenticated user clicks star
- Keep all data queries working (they'll use anon key now)

### 5. Make ProviderDetail Work Without Auth (`src/pages/ProviderDetail.tsx`)

- Skip audit log insert when no user
- Hide watchlist button when not logged in (or show "Sign in to watch")
- Keep CSV/PDF export visible to all (public data)
- Keep search, charts, all data visible

### 6. Make useWatchlist Gracefully Degrade (`src/hooks/useWatchlist.ts`)

- Return empty set and no-op toggle when user is null (already does this mostly, just needs the toggle to not throw)

### 7. Homepage Updates (`src/pages/Index.tsx`)

- Change CTA from `/auth` to `/dashboard`
- Remove auto-redirect to `/dashboard` when logged in (or keep it, users can still access dashboard directly)
- Enhance About section with: "Built by Arif Gasilov (University of Arizona) to make Medicare spending data accessible. OutlierGov is a free, open-source public accountability tool."

### 8. SEO Landing Pages CTA Fix

- **`src/components/SEOLandingPage.tsx`**: Change CTA link from `/auth` to `/dashboard`
- **`src/pages/QuiTamResearchTools.tsx`**: Add "free and open-source" to intro text
- **`src/pages/HealthcareFraudDataAttorneys.tsx`**: Add "free and open-source" to intro text

### 9. Terms of Service (`src/pages/Terms.tsx`) — Full Rewrite

Replace entire page content with the user's provided Terms of Use text. Use March 15, 2026 as the date. Structure with the same Card-based layout.

### 10. Auth Page Subtitle (`src/pages/Auth.tsx`)

Update description to: "Sign in to save watchlists, export reports, and access full provider profiles"
(Already says this — just confirm it's correct given the new framing)

---

### Files Modified (10)

| File | Scope |
|------|-------|
| `src/App.tsx` | Remove ProtectedRoute from data routes |
| `src/components/AppLayout.tsx` | Handle unauthenticated users |
| `src/pages/Dashboard.tsx` | Graceful degradation without auth |
| `src/pages/ProviderDetail.tsx` | Skip audit log, hide watchlist when no user |
| `src/hooks/useWatchlist.ts` | Graceful no-op when unauthenticated |
| `src/pages/Terms.tsx` | Full rewrite with user's text |
| `src/pages/Index.tsx` | CTA link, About section with personal details |
| `src/components/SEOLandingPage.tsx` | CTA link fix |
| `src/pages/QuiTamResearchTools.tsx` | Add "free and open-source" |
| `src/pages/HealthcareFraudDataAttorneys.tsx` | Add "free and open-source" |

### Database Migration

Add 2 RLS policies for public read access to `outlier_registry` and `provider_year_metrics`.

