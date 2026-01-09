-- Create anomalies_offline table for pre-computed anomaly data
CREATE TABLE public.anomalies_offline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi TEXT NOT NULL,
  provider_name TEXT,
  specialty TEXT,
  state TEXT,
  year INTEGER NOT NULL,
  total_allowed_amount NUMERIC,
  service_count INTEGER,
  beneficiary_count INTEGER,
  percentile_rank NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_anomalies_offline_npi_year 
  ON public.anomalies_offline(npi, year);

CREATE INDEX idx_anomalies_offline_specialty_state 
  ON public.anomalies_offline(specialty, state);

CREATE INDEX idx_anomalies_offline_percentile 
  ON public.anomalies_offline(percentile_rank DESC);

-- Enable RLS
ALTER TABLE public.anomalies_offline ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view
CREATE POLICY "Authenticated users can view anomalies_offline"
  ON public.anomalies_offline
  FOR SELECT
  USING (true);

-- Admins can manage (insert/update/delete)
CREATE POLICY "Admins can manage anomalies_offline"
  ON public.anomalies_offline
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));