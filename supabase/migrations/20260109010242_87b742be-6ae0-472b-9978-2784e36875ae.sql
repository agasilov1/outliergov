-- Add optimized composite indexes for the compute_peer_group_stats function
CREATE INDEX IF NOT EXISTS idx_pa_release_year_primary 
ON provider_attributes (dataset_release_id, year, is_primary_record) 
INCLUDE (provider_id, normalized_specialty, normalized_state);

CREATE INDEX IF NOT EXISTS idx_pym_release_year_provider 
ON provider_yearly_metrics (dataset_release_id, year, provider_id) 
INCLUDE (total_allowed_amount);

-- Replace compute_peer_group_stats with optimized version
CREATE OR REPLACE FUNCTION public.compute_peer_group_stats(
  p_dataset_release_id uuid,
  p_years integer[],
  p_metric_name text DEFAULT 'total_allowed_amount',
  p_peer_group_key text DEFAULT 'specialty_state',
  p_peer_group_version text DEFAULT 'v1'
)
RETURNS TABLE(groups_computed integer, years_processed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_groups_computed integer := 0;
  v_total_groups integer := 0;
BEGIN
  -- Process each year individually to reduce memory pressure
  FOREACH v_year IN ARRAY p_years
  LOOP
    -- Delete existing stats for this specific year/release/metric combination
    DELETE FROM peer_group_stats
    WHERE dataset_release_id = p_dataset_release_id
      AND year = v_year
      AND metric_name = p_metric_name
      AND peer_group_key = p_peer_group_key
      AND peer_group_version = p_peer_group_version;

    -- Insert new stats using PERCENTILE_DISC (faster than PERCENTILE_CONT)
    -- Only join on exact dataset_release_id match (no OR NULL condition)
    INSERT INTO peer_group_stats (
      dataset_release_id,
      year,
      metric_name,
      peer_group_key,
      peer_group_version,
      normalized_specialty,
      normalized_state,
      peer_size,
      mean,
      p50,
      p95,
      p99,
      p995
    )
    SELECT
      p_dataset_release_id,
      v_year,
      p_metric_name,
      p_peer_group_key,
      p_peer_group_version,
      pa.normalized_specialty,
      pa.normalized_state,
      COUNT(*)::integer AS peer_size,
      AVG(m.total_allowed_amount) AS mean,
      PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p50,
      PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p95,
      PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p99,
      PERCENTILE_DISC(0.995) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p995
    FROM provider_attributes pa
    INNER JOIN provider_yearly_metrics m
      ON m.provider_id = pa.provider_id
      AND m.year = v_year
      AND m.dataset_release_id = p_dataset_release_id
    WHERE pa.dataset_release_id = p_dataset_release_id
      AND pa.year = v_year
      AND pa.is_primary_record = true
    GROUP BY pa.normalized_specialty, pa.normalized_state
    HAVING COUNT(*) >= 1;

    GET DIAGNOSTICS v_groups_computed = ROW_COUNT;
    v_total_groups := v_total_groups + v_groups_computed;
    
    RAISE NOTICE 'Year % completed: % groups computed', v_year, v_groups_computed;
  END LOOP;

  RETURN QUERY SELECT v_total_groups, array_length(p_years, 1);
END;
$$;