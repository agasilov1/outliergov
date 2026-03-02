

## Plan: Show Drug % on Provider Profile Page

### Problem
The profile page fetches `drug_pct` but only displays it inside the DataContextCard when it exceeds 80%. There's no standalone display of the drug percentage, so users can't see it for providers below the threshold.

### Fix
Add a "Drug %" stat to the provider header card's summary row (the `flex flex-wrap gap-6` section around line 501 that already shows Peer Group, Peer Group Size, Max Allowed Amount, and Years as Outlier). This will show the drug percentage for all providers, formatted with truncation to 1 decimal place.

### Changes

**`src/pages/ProviderDetail.tsx`** (~line 528, after the "Max Allowed Amount" div):
- Add a new stat item showing "Drug %: XX.X%" using `Math.floor(drug_pct * 1000) / 10` for truncation
- Use the latest year's `drug_pct` value from `metricsData`
- Show "N/A" if `drug_pct` is null

### Files to modify
- **`src/pages/ProviderDetail.tsx`**: Add Drug % to the header card summary stats

