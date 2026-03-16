

## Shift to Fully Open: localStorage Watchlist + Remove Sign-in UI

### Changes

**1. Rewrite `useWatchlist` hook to use localStorage** (`src/hooks/useWatchlist.ts`)
- Remove all Supabase/auth dependencies
- Store watchlist NPIs as a JSON array in `localStorage` under key `outlierGov_watchlist`
- Use `useState` initialized from localStorage, persist on every change
- Keep the same return shape (`watchlistSet`, `toggleWatchlist`, `isLoading: false`, `isToggling: false`)

**2. Remove sign-in buttons from AppLayout** (`src/components/AppLayout.tsx`)
- Sidebar footer: remove the "Sign in" link block (the `else` branch showing sign-in for unauthenticated users)
- Mobile header: remove the "Sign in" button for unauthenticated users
- Keep sign-out button visible for admin users who are already logged in

**3. Remove sign-in prompt from Dashboard** (`src/pages/Dashboard.tsx`)
- Lines 508-527: Remove the `user ? ... : <sign in link>` conditional — always show the watchlist toggle (since it's now localStorage-based, no auth needed)
- Remove the "Sign in to save watchlists and export reports" text entirely

**4. Remove auth redirect from Index** (`src/pages/Index.tsx`)
- Remove the `useEffect` that redirects authenticated users to `/dashboard` (lines 33-37) — homepage is always the homepage now
- Remove `useAuth` import and usage

**5. Update Auth page description** (`src/pages/Auth.tsx`)
- Remove the line "Sign in to save watchlists, export reports, and access full provider profiles" from `CardDescription`
- Keep the Auth page itself functional for admin access

### Files modified
- `src/hooks/useWatchlist.ts` — full rewrite to localStorage
- `src/components/AppLayout.tsx` — remove sign-in buttons
- `src/pages/Dashboard.tsx` — always show watchlist, remove sign-in prompt
- `src/pages/Index.tsx` — remove auth redirect
- `src/pages/Auth.tsx` — remove the specified description line

