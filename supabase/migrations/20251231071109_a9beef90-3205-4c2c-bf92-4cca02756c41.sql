-- Fix ambiguous column reference in compute_anomaly_flags_v2
-- The issue is that 'compute_run_id' exists both as a column in anomaly_flags_v2 
-- and as an OUT parameter in the RETURNS TABLE definition
CREATE OR REPLACE FUNCTION public.compute_anomaly_flags_v2(
    p_dataset_release_id uuid,
    p_years_window integer[] DEFAULT ARRAY[2023, 2024],
    p_threshold_percentile numeric DEFAULT 99.5,
    p_consecutive_years_required integer DEFAULT 2,
    p_min_peer_size_required integer DEFAULT 20,
    p_peer_group_key text DEFAULT 'specialty_state'::text,
    p_peer_group_version text DEFAULT 'v1'::text,
    p_metric_name text DEFAULT 'total_allowed_amount'::text,
    p_rule_set_version text DEFAULT 'outlier_v1.0'::text,
    p_created_by uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    providers_analyzed integer,
    peer_groups_analyzed integer,
    providers_flagged integer,
    providers_suppressed_low_sample integer,
    compute_run_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_compute_run_id uuid;
    v_providers_analyzed integer := 0;
    v_peer_groups_analyzed integer := 0;
    v_providers_flagged integer := 0;
    v_providers_suppressed integer := 0;
    v_year integer;
    v_missing_years integer[];
BEGIN
    -- Validate dataset release exists
    IF NOT EXISTS (SELECT 1 FROM public.dataset_releases WHERE id = p_dataset_release_id) THEN
        RAISE EXCEPTION 'Dataset release % does not exist', p_dataset_release_id;
    END IF;
    
    -- Validate years window length matches consecutive years required
    IF array_length(p_years_window, 1) < p_consecutive_years_required THEN
        RAISE EXCEPTION 'Years window (%) must contain at least % years', 
            array_length(p_years_window, 1), p_consecutive_years_required;
    END IF;
    
    -- GUARD: Check that peer_group_stats exist for ALL requested years
    SELECT ARRAY_AGG(y) INTO v_missing_years
    FROM unnest(p_years_window) AS y
    WHERE NOT EXISTS (
        SELECT 1 FROM public.peer_group_stats pgs
        WHERE pgs.dataset_release_id = p_dataset_release_id
          AND pgs.year = y
          AND pgs.metric_name = p_metric_name
          AND pgs.peer_group_key = p_peer_group_key
          AND pgs.peer_group_version = p_peer_group_version
    );
    
    IF v_missing_years IS NOT NULL AND array_length(v_missing_years, 1) > 0 THEN
        RAISE EXCEPTION 'Missing peer_group_stats for years: %. Run compute_peer_group_stats first for dataset_release_id=%, metric=%, peer_group_key=%, version=%',
            v_missing_years, p_dataset_release_id, p_metric_name, p_peer_group_key, p_peer_group_version;
    END IF;
    
    -- Create compute run record
    INSERT INTO public.compute_runs (
        dataset_release_id, run_type, rule_set_version, parameters_json, created_by, status
    ) VALUES (
        p_dataset_release_id,
        'compute_flags',
        p_rule_set_version,
        jsonb_build_object(
            'years_window', p_years_window,
            'threshold_percentile', p_threshold_percentile,
            'consecutive_years_required', p_consecutive_years_required,
            'min_peer_size_required', p_min_peer_size_required,
            'peer_group_key', p_peer_group_key,
            'peer_group_version', p_peer_group_version,
            'metric_name', p_metric_name
        ),
        p_created_by,
        'running'
    ) RETURNING id INTO v_compute_run_id;
    
    BEGIN
        -- Delete existing flags for this release/rule_set combination
        DELETE FROM public.anomaly_flags_v2
        WHERE dataset_release_id = p_dataset_release_id
          AND rule_set_version = p_rule_set_version
          AND peer_group_key = p_peer_group_key
          AND peer_group_version = p_peer_group_version
          AND metric_name = p_metric_name;
        
        -- Insert anomaly flags with per-year detail
        WITH provider_year_stats AS (
            -- Get provider metrics with percentile ranks for each year
            SELECT 
                pa.provider_id,
                pa.normalized_specialty,
                pa.normalized_state,
                pa.year,
                m.total_allowed_amount AS value,
                pgs.p995 AS p995_threshold,
                pgs.peer_size,
                PERCENT_RANK() OVER (
                    PARTITION BY pa.normalized_specialty, pa.normalized_state, pa.year 
                    ORDER BY m.total_allowed_amount
                ) * 100 AS percentile_rank
            FROM public.provider_attributes pa
            JOIN public.provider_yearly_metrics m 
                ON m.provider_id = pa.provider_id 
                AND m.year = pa.year
                AND (m.dataset_release_id = p_dataset_release_id OR m.dataset_release_id IS NULL)
            JOIN public.peer_group_stats pgs
                ON pgs.dataset_release_id = p_dataset_release_id
                AND pgs.normalized_specialty = pa.normalized_specialty
                AND pgs.normalized_state = pa.normalized_state
                AND pgs.year = pa.year
                AND pgs.metric_name = p_metric_name
                AND pgs.peer_group_key = p_peer_group_key
                AND pgs.peer_group_version = p_peer_group_version
            WHERE pa.dataset_release_id = p_dataset_release_id
              AND pa.year = ANY(p_years_window)
              AND pa.is_primary_record = true
        ),
        provider_summary AS (
            -- Aggregate across years for each provider
            SELECT 
                provider_id,
                normalized_specialty,
                normalized_state,
                COUNT(*) FILTER (WHERE percentile_rank >= p_threshold_percentile) AS years_above_threshold,
                COUNT(*) AS years_present,
                MIN(peer_size) AS min_peer_size,
                BOOL_AND(peer_size >= p_min_peer_size_required) AS all_years_sufficient_peers,
                ARRAY_AGG(year ORDER BY year) AS years_data
            FROM provider_year_stats
            GROUP BY provider_id, normalized_specialty, normalized_state
        ),
        flaggable_providers AS (
            -- Providers that meet threshold in required consecutive years
            SELECT 
                ps.*,
                CASE 
                    WHEN ps.years_above_threshold >= p_consecutive_years_required 
                         AND ps.years_present >= p_consecutive_years_required THEN true
                    ELSE false
                END AS meets_threshold,
                CASE 
                    WHEN NOT ps.all_years_sufficient_peers THEN 
                        'Suppressed: Peer group size below minimum (' || ps.min_peer_size || ' < ' || p_min_peer_size_required || ')'
                    WHEN ps.years_above_threshold >= p_consecutive_years_required THEN
                        'Flagged: Percentile rank >= ' || p_threshold_percentile || ' for ' || ps.years_above_threshold || ' consecutive years'
                    ELSE
                        'Not flagged: Did not meet threshold for required consecutive years'
                END AS flag_reason
            FROM provider_summary ps
            WHERE ps.years_above_threshold >= p_consecutive_years_required
               OR (ps.years_present >= p_consecutive_years_required AND ps.years_above_threshold > 0)
        ),
        inserted_flags AS (
            -- Insert flags (both flagged=true and flagged=false for suppressed)
            INSERT INTO public.anomaly_flags_v2 (
                provider_id, dataset_release_id, compute_run_id,
                peer_group_key, peer_group_version,
                normalized_specialty, normalized_state,
                metric_name, rule_set_version,
                consecutive_years_required, threshold_percentile_required, min_peer_size_required,
                flagged, flag_reason, computed_at
            )
            SELECT 
                fp.provider_id,
                p_dataset_release_id,
                v_compute_run_id,
                p_peer_group_key,
                p_peer_group_version,
                fp.normalized_specialty,
                fp.normalized_state,
                p_metric_name,
                p_rule_set_version,
                p_consecutive_years_required,
                p_threshold_percentile,
                p_min_peer_size_required,
                fp.meets_threshold AND fp.all_years_sufficient_peers,
                fp.flag_reason,
                now()
            FROM flaggable_providers fp
            RETURNING id, provider_id, flagged
        )
        -- Insert year details for each flag
        INSERT INTO public.anomaly_flag_years (
            anomaly_flag_id, year, value, percentile_rank, peer_size, p995_threshold
        )
        SELECT 
            inf.id,
            pys.year,
            pys.value,
            pys.percentile_rank,
            pys.peer_size,
            pys.p995_threshold
        FROM inserted_flags inf
        JOIN provider_year_stats pys ON pys.provider_id = inf.provider_id;
        
        -- Compute statistics
        SELECT COUNT(DISTINCT provider_id) INTO v_providers_analyzed
        FROM public.provider_attributes
        WHERE dataset_release_id = p_dataset_release_id;
        
        SELECT COUNT(DISTINCT (normalized_specialty, normalized_state)) INTO v_peer_groups_analyzed
        FROM public.peer_group_stats
        WHERE dataset_release_id = p_dataset_release_id
          AND metric_name = p_metric_name;
        
        -- FIX: Use explicit table alias 'af' to avoid ambiguity with OUT parameter 'compute_run_id'
        SELECT 
            COUNT(*) FILTER (WHERE af.flagged = true),
            COUNT(*) FILTER (WHERE af.flagged = false)
        INTO v_providers_flagged, v_providers_suppressed
        FROM public.anomaly_flags_v2 af
        WHERE af.compute_run_id = v_compute_run_id;
        
        -- Update compute run as successful
        UPDATE public.compute_runs
        SET status = 'success',
            finished_at = now()
        WHERE id = v_compute_run_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Mark compute run as failed
        UPDATE public.compute_runs
        SET status = 'failed',
            finished_at = now(),
            error_message = SQLERRM
        WHERE id = v_compute_run_id;
        
        RAISE;
    END;
    
    RETURN QUERY SELECT v_providers_analyzed, v_peer_groups_analyzed, v_providers_flagged, v_providers_suppressed, v_compute_run_id;
END;
$function$;