-- Fix compute_runs run_type constraint to allow 'ingest' and 'anomaly_flags_v2'
ALTER TABLE public.compute_runs 
DROP CONSTRAINT IF EXISTS compute_runs_run_type_check;

ALTER TABLE public.compute_runs 
ADD CONSTRAINT compute_runs_run_type_check 
CHECK (run_type IN ('seed', 'compute_stats', 'compute_flags', 'ingest', 'anomaly_flags_v2'));