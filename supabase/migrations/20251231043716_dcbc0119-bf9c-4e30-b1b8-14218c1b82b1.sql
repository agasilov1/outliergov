CREATE OR REPLACE FUNCTION public.compute_anomaly_flags()
 RETURNS TABLE(providers_analyzed integer, peer_groups_analyzed integer, providers_flagged integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_providers_analyzed integer;
    v_peer_groups_analyzed integer;
    v_providers_flagged integer;
BEGIN
    -- Clear existing flags (WHERE true required by pg_safeupdate)
    DELETE FROM public.anomaly_flags WHERE true;
    
    -- Compute peer group percentiles and flag outliers
    INSERT INTO public.anomaly_flags (
        provider_id, specialty, state,
        percentile_2023, percentile_2024,
        threshold_2023, threshold_2024,
        peer_group_size, rule_version, computed_at
    )
    WITH peer_metrics AS (
        SELECT 
            p.id AS provider_id,
            p.specialty,
            p.state,
            m.year,
            m.total_allowed_amount,
            PERCENT_RANK() OVER (
                PARTITION BY p.specialty, p.state, m.year 
                ORDER BY m.total_allowed_amount
            ) * 100 AS percentile,
            PERCENTILE_CONT(0.995) WITHIN GROUP (
                ORDER BY m.total_allowed_amount
            ) OVER (PARTITION BY p.specialty, p.state, m.year) AS threshold_995,
            COUNT(*) OVER (PARTITION BY p.specialty, p.state, m.year) AS peer_size
        FROM public.providers p
        JOIN public.provider_yearly_metrics m ON m.provider_id = p.id
    ),
    pivoted AS (
        SELECT 
            provider_id,
            specialty,
            state,
            MAX(CASE WHEN year = 2023 THEN percentile END) AS pct_2023,
            MAX(CASE WHEN year = 2024 THEN percentile END) AS pct_2024,
            MAX(CASE WHEN year = 2023 THEN threshold_995 END) AS thresh_2023,
            MAX(CASE WHEN year = 2024 THEN threshold_995 END) AS thresh_2024,
            MAX(peer_size) AS peer_group_size
        FROM peer_metrics
        GROUP BY provider_id, specialty, state
    )
    SELECT 
        provider_id, specialty, state,
        pct_2023, pct_2024,
        thresh_2023, thresh_2024,
        peer_group_size,
        'v1.0',
        now()
    FROM pivoted
    WHERE pct_2023 >= 99.5 AND pct_2024 >= 99.5;
    
    -- Return stats
    SELECT COUNT(*) INTO v_providers_analyzed FROM public.providers;
    SELECT COUNT(DISTINCT (specialty, state)) INTO v_peer_groups_analyzed 
    FROM public.providers;
    SELECT COUNT(*) INTO v_providers_flagged FROM public.anomaly_flags;
    
    RETURN QUERY SELECT v_providers_analyzed, v_peer_groups_analyzed, v_providers_flagged;
END;
$function$;