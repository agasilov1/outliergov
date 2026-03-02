

## Plan: Fix Drug % N/A + Add Drug % to PDF

### Root Cause: Drug % showing N/A
The code always picks the **last year** (`metricsData[metricsData.length - 1]`) for Drug %. For NPI 1356441943, the 2023 row has `drug_pct = null` while the 2022 row has `drug_pct = 0.999836`. The CMS data simply doesn't include drug breakdown for 2023 for this provider.

**Fix**: Fall back to the most recent year that has a non-null `drug_pct` value, instead of always using the last year. Apply this in both the UI display and the PDF data context.

### Add Drug % to PDF export
Currently the PDF has no explicit Drug % line. Add it to the Key Metrics row on page 1 (change from 4 metrics to 5, or replace "Peer Group Size" which is already shown in the Peer Group Snapshot above). Simpler approach: add a "Drug %" item as a 5th metric in the key metrics row using a 5-column layout.

### Changes to `src/pages/ProviderDetail.tsx`
1. **Drug % display (line ~549)**: Instead of `metricsData[metricsData.length - 1]?.drug_pct`, find the last entry with a non-null `drug_pct`: `[...metricsData].reverse().find(m => m.drug_pct != null)?.drug_pct`
2. **PDF dataContext (line ~145)**: Same fallback — find the most recent year with non-null `drug_pct` instead of using `latest?.drug_pct`
3. **DataContextCard props (line ~868)**: Same fallback for the `drugPct` prop passed to DataContextCard

### Changes to `src/lib/generateProviderPDF.ts`
1. **Add `drugPct` to the Key Metrics row** (line ~278): Add a 5th metric "Drug %" showing the value formatted as a percentage, or "N/A" if null. Adjust column width from `CONTENT_W / 4` to `CONTENT_W / 5`.

### Files to modify
- `src/pages/ProviderDetail.tsx` — fallback logic for drug_pct
- `src/lib/generateProviderPDF.ts` — add Drug % to key metrics row

