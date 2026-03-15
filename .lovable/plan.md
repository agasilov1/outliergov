

## Cache Invalidation for AI Summaries

### The Problem
When new year data is ingested (e.g., 2025 data added), cached summaries become stale because they were generated from older metrics.

### Solution: Clear cache during data ingestion

The simplest, most reliable approach: **delete matching rows from `provider_summaries` when new data is upserted** into `provider_year_metrics`. This way, the next time someone views that provider, a fresh summary is generated with the latest data.

### Implementation

**Option A — Batch clear in the ingestion function** (recommended)

Add a step to `batch-upsert-provider-year/index.ts`: after upserting rows, collect the distinct NPIs from the batch and delete their cached summaries.

```ts
// After successful upsert of provider_year_metrics rows:
const npis = [...new Set(rows.map(r => r.npi))];
await supabaseAdmin
  .from("provider_summaries")
  .delete()
  .in("npi", npis);
```

This is ~3 lines of code in one file. No new tables, no triggers, no cron jobs.

**Why not a DB trigger?** Triggers on `provider_year_metrics` would fire per-row during bulk ingestion (thousands of deletes). The batch approach is cleaner.

**Why not a timestamp/TTL?** Adds complexity and still serves stale data until expiry. Direct invalidation is precise.

### Files Modified (1)

| File | Change |
|------|--------|
| `supabase/functions/batch-upsert-provider-year/index.ts` | Add ~3 lines to delete cached summaries for upserted NPIs after successful batch insert |

