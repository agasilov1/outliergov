

## Plan: Fix Provider Ranking + Drug % Rounding

### Issue 1: Profile page ranking shows filtered count

**Problem:** The dashboard passes its filtered `rank` and `total` via URL params when navigating to the provider page. When filters (drug-dominant, institutional) are active, the total reflects the filtered subset, not the full registry.

**Fix in `src/pages/ProviderDetail.tsx`:**
- Instead of relying on `total` from URL params, fetch the actual full registry count directly:
  ```
  const { count } = await supabase
    .from('outlier_registry')
    .select('npi', { count: 'exact', head: true })
  ```
- Similarly, compute the provider's true rank by counting how many providers have a higher `max_x_vs_peer_median` (the current sort):
  ```
  const { count: higherCount } = await supabase
    .from('outlier_registry')
    .select('npi', { count: 'exact', head: true })
    .gt('max_x_vs_peer_median', providerRow.max_x_vs_peer_median)
  // rank = higherCount + 1
  ```
- This makes the rank always reflect the full unfiltered registry, independent of dashboard filters.
- Remove reliance on `rank` and `total` URL params for the display (keep `returnTo` for back navigation).

**Fix in `src/pages/Dashboard.tsx`:**
- Remove `rank` and `total` from the navigation URL since the profile page will compute its own rank.

**Fix in `src/components/ProviderBrief.tsx`:**
- The brief also receives `rank` and `totalProviders` as props — update to use the same self-computed values.

### Issue 2: Drug % rounds 99.97% up to 100.0%

**Problem:** `(0.999651 * 100).toFixed(1)` produces `"100.0"` due to rounding. The user wants truncation to 1 decimal place so it shows `"99.9%"`.

**Fix:** Create a `truncateToOneDecimal` helper that floors to 1 decimal place instead of rounding:
```ts
const pct = Math.floor(value * 1000) / 10; // 0.999651 → 99.9
```

Apply this in:
- `src/components/DataContextCard.tsx` (line 24)
- `src/pages/Dashboard.tsx` (line 657)

### Files to modify
- **`src/pages/ProviderDetail.tsx`**: Add query to fetch unfiltered rank + total from `outlier_registry`
- **`src/pages/Dashboard.tsx`**: Remove rank/total from nav URL; fix drug % truncation
- **`src/components/DataContextCard.tsx`**: Fix drug % truncation
- **`src/components/ProviderBrief.tsx`**: Use self-computed rank if applicable

