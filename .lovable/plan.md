

# Features: Provider Watchlist, Outlier Visualizations, Provider Comparison

## Feature 1: Provider Watchlist

### Database
Create a `watchlist_items` table:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `user_id` (uuid, NOT NULL) — references the authenticated user
- `npi` (text, NOT NULL) — the provider NPI
- `created_at` (timestamptz, default `now()`)
- Unique constraint on `(user_id, npi)`

RLS policies:
- Users can SELECT/INSERT/DELETE their own rows (`auth.uid() = user_id`)

### Frontend Changes
- **Dashboard table**: Add a star/bookmark icon column (first column). Clicking toggles the watchlist entry via insert/delete. Query `watchlist_items` for the current user to know which NPIs are starred.
- **Dashboard filters**: Add a "My Watchlist" toggle (Switch) next to the existing filters. When active, filter the `outlier_registry` query to only NPIs present in the user's `watchlist_items`.
- **Provider Detail page**: Add a star/bookmark button in the header card next to the export buttons.

### Files Modified
- New migration SQL (watchlist_items table + RLS)
- `src/pages/Dashboard.tsx` — add watchlist query, star column, toggle filter
- `src/pages/ProviderDetail.tsx` — add watchlist toggle button

---

## Feature 3: Outlier Concentration Visualizations

### New Component: `OutlierConcentrationCharts`
A new component on the Dashboard, placed between the stats cards and the rankings table.

Two visualizations using Recharts (already installed):
1. **Top 10 Specialties bar chart** — horizontal bars showing count of outliers per specialty, from `outlier_registry` grouped by specialty.
2. **Top 10 States bar chart** — horizontal bars showing count of outliers per state, from `outlier_registry` grouped by state.

Data is fetched via two simple queries on `outlier_registry` with `GROUP BY` and `ORDER BY count DESC LIMIT 10`. Respects the "exclude institutional" toggle.

### Files
- New file: `src/components/OutlierConcentrationCharts.tsx`
- `src/pages/Dashboard.tsx` — import and render the new component, pass `excludeInstitutional` prop

---

## Feature 5: Provider Comparison View

### New Page: `/compare`
Allows side-by-side comparison of 2-3 providers selected from the dashboard.

### Selection Mechanism
- Add a checkbox column to the Dashboard table rows (alongside the new star column).
- Track selected NPIs in state (max 3).
- Show a floating "Compare (N)" button when 2-3 providers are selected, linking to `/compare?npis=NPI1,NPI2,NPI3`.

### Compare Page
- Read NPIs from URL query params.
- Fetch `provider_year_metrics` for each NPI.
- Display:
  - Header cards for each provider (name, specialty, state, peer ratio).
  - Side-by-side metrics table (year rows, one column group per provider) showing allowed per bene, peer median, x vs median, percentile.
  - Overlaid Recharts line chart with one line per provider (allowed per bene over years) plus the peer median dashed line.

### Files
- New file: `src/pages/ProviderCompare.tsx`
- `src/App.tsx` — add route `/compare` (protected)
- `src/pages/Dashboard.tsx` — add selection checkboxes, compare button

---

## Implementation Order
1. Database migration (watchlist table)
2. Outlier Concentration Charts component (no DB changes needed)
3. Watchlist UI on Dashboard and Provider Detail
4. Provider Comparison page and Dashboard selection UI

## Technical Notes
- All queries use existing `outlier_registry` and `provider_year_metrics` tables with existing RLS.
- Watchlist uses client-side Supabase SDK with `auth.uid()` for RLS.
- No edge functions needed — all client-side queries.
- Concentration charts use `useQuery` with grouping done in JS (since Supabase client doesn't support `GROUP BY`, we fetch distinct values and count, or use a lightweight approach fetching all specialties/states and counting client-side from the already-fetched filter options data).

