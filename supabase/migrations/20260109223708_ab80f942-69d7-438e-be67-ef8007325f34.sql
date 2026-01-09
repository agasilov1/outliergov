-- Add peer comparison fields for enriched offline analysis
ALTER TABLE public.anomalies_offline
ADD COLUMN IF NOT EXISTS peer_median_allowed numeric,
ADD COLUMN IF NOT EXISTS peer_p75_allowed numeric,
ADD COLUMN IF NOT EXISTS peer_group_size integer,
ADD COLUMN IF NOT EXISTS allowed_vs_peer_median numeric,
ADD COLUMN IF NOT EXISTS allowed_vs_peer_median_log numeric;

-- Add comments for documentation
COMMENT ON COLUMN public.anomalies_offline.peer_median_allowed IS 'Median allowed amount for the specialty-state peer group';
COMMENT ON COLUMN public.anomalies_offline.peer_p75_allowed IS '75th percentile allowed amount for the peer group';
COMMENT ON COLUMN public.anomalies_offline.peer_group_size IS 'Number of providers in the peer group';
COMMENT ON COLUMN public.anomalies_offline.allowed_vs_peer_median IS 'Ratio of provider allowed amount to peer median';
COMMENT ON COLUMN public.anomalies_offline.allowed_vs_peer_median_log IS 'Log-transformed ratio for statistical analysis';