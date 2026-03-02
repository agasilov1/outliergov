ALTER TABLE public.provider_year_metrics
  ADD COLUMN IF NOT EXISTS drug_allowed_cents bigint,
  ADD COLUMN IF NOT EXISTS med_allowed_cents bigint,
  ADD COLUMN IF NOT EXISTS drug_pct double precision,
  ADD COLUMN IF NOT EXISTS bene_avg_risk_score double precision,
  ADD COLUMN IF NOT EXISTS bene_avg_age double precision,
  ADD COLUMN IF NOT EXISTS tot_hcpcs_cds integer;