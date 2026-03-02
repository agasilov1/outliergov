

## Plan: Add 6 New Columns to `provider_year_metrics` + Update Edge Function

### 1. Database Migration
Add 6 nullable columns to `provider_year_metrics`:

```sql
ALTER TABLE public.provider_year_metrics
  ADD COLUMN IF NOT EXISTS drug_allowed_cents bigint,
  ADD COLUMN IF NOT EXISTS med_allowed_cents bigint,
  ADD COLUMN IF NOT EXISTS drug_pct double precision,
  ADD COLUMN IF NOT EXISTS bene_avg_risk_score double precision,
  ADD COLUMN IF NOT EXISTS bene_avg_age double precision,
  ADD COLUMN IF NOT EXISTS tot_hcpcs_cds integer;
```

All nullable with no defaults — existing rows get NULL, no backfill needed.

### 2. Edge Function Update (`batch-upsert-provider-year/index.ts`)
No code changes needed in the edge function itself. It already does a generic `supabase.from("provider_year_metrics").upsert(rows, { onConflict: "npi,year" })` — it passes through whatever fields are in the `rows` JSON payload. Once the columns exist in the table, the upsert will accept the new fields automatically.

### Summary
- **One migration** to add the 6 columns
- **No edge function code changes** — the existing pass-through upsert handles it

