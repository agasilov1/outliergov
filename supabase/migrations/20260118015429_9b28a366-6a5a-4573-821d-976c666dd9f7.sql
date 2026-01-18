-- Create provider_year_metrics table
CREATE TABLE IF NOT EXISTS provider_year_metrics (
  npi TEXT NOT NULL,
  year INT NOT NULL,
  provider_name TEXT,
  specialty TEXT,
  state TEXT,
  entity_type TEXT,
  zip5 TEXT,

  tot_benes BIGINT,
  tot_srvcs BIGINT,
  tot_allowed_cents BIGINT,
  tot_stdzd_cents BIGINT,
  allowed_per_bene_cents BIGINT,

  peer_group_size INT,
  peer_median_allowed_per_bene DOUBLE PRECISION,
  peer_p75_allowed_per_bene DOUBLE PRECISION,
  peer_p995_allowed_per_bene DOUBLE PRECISION,
  percentile_rank DOUBLE PRECISION,
  x_vs_peer_median DOUBLE PRECISION,
  verified_top_0_5 BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (npi, year)
);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_provider_year_metrics_state_specialty_year 
  ON provider_year_metrics(state, specialty, year);

-- Enable RLS
ALTER TABLE provider_year_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any, then create with expired check
DROP POLICY IF EXISTS "Allow authenticated read on provider_year_metrics" ON provider_year_metrics;
DROP POLICY IF EXISTS "Active authenticated users can view provider_year_metrics" ON provider_year_metrics;

CREATE POLICY "Active authenticated users can view provider_year_metrics"
ON provider_year_metrics
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.expired = true
  )
);

-- Create outlier_registry table
CREATE TABLE IF NOT EXISTS outlier_registry (
  npi TEXT PRIMARY KEY,
  provider_name TEXT,
  specialty TEXT,
  state TEXT,
  years_as_outlier INT,
  max_x_vs_peer_median DOUBLE PRECISION,
  max_total_allowed DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE outlier_registry ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any, then create with expired check
DROP POLICY IF EXISTS "Allow authenticated read on outlier_registry" ON outlier_registry;
DROP POLICY IF EXISTS "Active authenticated users can view outlier_registry" ON outlier_registry;

CREATE POLICY "Active authenticated users can view outlier_registry"
ON outlier_registry
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.expired = true
  )
);