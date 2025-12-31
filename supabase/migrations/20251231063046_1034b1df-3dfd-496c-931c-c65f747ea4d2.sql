
-- =====================================================
-- AUDIT-READY STATISTICAL OUTLIER MODELING LAYER
-- Migration: Phase 1 - Schema Architecture
-- =====================================================

-- 1. DATASET RELEASES TABLE
-- Tracks data sources, versions, and lineage
CREATE TABLE public.dataset_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_key text NOT NULL,
    release_label text NOT NULL,
    source_url text,
    source_published_at timestamptz,
    ingested_at timestamptz DEFAULT now(),
    file_hash text,
    notes text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(dataset_key, release_label)
);

-- 2. SPECIALTY MAP TABLE
-- Normalization lookup for specialties
CREATE TABLE public.specialty_map (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_value text NOT NULL UNIQUE,
    normalized_specialty text NOT NULL,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 3. PEER GROUP DEFINITIONS TABLE
-- Documents how peer groups are constructed
CREATE TABLE public.peer_group_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL,
    version text NOT NULL,
    definition_json jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(key, version)
);

-- Insert default peer group definition
INSERT INTO public.peer_group_definitions (key, version, definition_json)
VALUES (
    'specialty_state',
    'v1',
    '{
        "description": "Peer group defined by normalized specialty and normalized state",
        "dimensions": ["normalized_specialty", "normalized_state"],
        "notes": "Primary peer group assignment uses highest allowed amount specialty when provider has multiple"
    }'::jsonb
);

-- 4. PROVIDER ATTRIBUTES TABLE
-- Slowly changing dimensions per release/year
CREATE TABLE public.provider_attributes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    dataset_release_id uuid NOT NULL REFERENCES public.dataset_releases(id) ON DELETE CASCADE,
    year integer NOT NULL,
    provider_display_name text,
    raw_specialty text,
    normalized_specialty text NOT NULL,
    raw_state text,
    normalized_state text NOT NULL,
    taxonomy_code text,
    is_primary_record boolean DEFAULT true,
    unmapped_specialty boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(provider_id, dataset_release_id, year, normalized_specialty, normalized_state, is_primary_record)
);

-- 5. PEER GROUP STATS TABLE
-- Materialized group statistics per release/year
CREATE TABLE public.peer_group_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_release_id uuid NOT NULL REFERENCES public.dataset_releases(id) ON DELETE CASCADE,
    year integer NOT NULL,
    peer_group_key text NOT NULL,
    peer_group_version text NOT NULL,
    normalized_specialty text NOT NULL,
    normalized_state text NOT NULL,
    peer_size integer NOT NULL,
    metric_name text NOT NULL,
    p50 numeric,
    p95 numeric,
    p99 numeric,
    p995 numeric,
    mean numeric,
    created_at timestamptz DEFAULT now(),
    UNIQUE(dataset_release_id, year, peer_group_key, peer_group_version, normalized_specialty, normalized_state, metric_name)
);

-- 6. COMPUTE RUNS TABLE
-- Audit trail for all computations
CREATE TABLE public.compute_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_release_id uuid REFERENCES public.dataset_releases(id) ON DELETE SET NULL,
    run_type text NOT NULL CHECK (run_type IN ('seed', 'compute_stats', 'compute_flags')),
    rule_set_version text NOT NULL,
    parameters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    error_message text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- 7. ANOMALY FLAGS V2 TABLE
-- New flexible schema - preserves original anomaly_flags table
CREATE TABLE public.anomaly_flags_v2 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    dataset_release_id uuid NOT NULL REFERENCES public.dataset_releases(id) ON DELETE CASCADE,
    compute_run_id uuid REFERENCES public.compute_runs(id) ON DELETE SET NULL,
    peer_group_key text NOT NULL,
    peer_group_version text NOT NULL,
    normalized_specialty text NOT NULL,
    normalized_state text NOT NULL,
    metric_name text NOT NULL,
    rule_set_version text NOT NULL,
    consecutive_years_required integer NOT NULL DEFAULT 2,
    threshold_percentile_required numeric NOT NULL DEFAULT 99.5,
    min_peer_size_required integer NOT NULL DEFAULT 20,
    flagged boolean NOT NULL DEFAULT false,
    flag_reason text,
    computed_at timestamptz DEFAULT now(),
    UNIQUE(provider_id, dataset_release_id, peer_group_key, peer_group_version, metric_name, rule_set_version)
);

-- 8. ANOMALY FLAG YEARS TABLE
-- Per-year detail for each flag
CREATE TABLE public.anomaly_flag_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_flag_id uuid NOT NULL REFERENCES public.anomaly_flags_v2(id) ON DELETE CASCADE,
    year integer NOT NULL,
    value numeric NOT NULL,
    percentile_rank numeric NOT NULL,
    peer_size integer NOT NULL,
    p995_threshold numeric NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(anomaly_flag_id, year)
);

-- 9. MODIFY PROVIDERS TABLE
-- Add entity_type column (nullable for backward compatibility)
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'unknown' 
CHECK (entity_type IN ('individual', 'organization', 'unknown'));

-- 10. MODIFY PROVIDER_YEARLY_METRICS TABLE
-- Add new columns for enhanced lineage (all nullable for backward compatibility)
ALTER TABLE public.provider_yearly_metrics 
ADD COLUMN IF NOT EXISTS dataset_release_id uuid REFERENCES public.dataset_releases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_count integer,
ADD COLUMN IF NOT EXISTS beneficiary_count integer;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dataset_releases_status ON public.dataset_releases(status);
CREATE INDEX IF NOT EXISTS idx_dataset_releases_key ON public.dataset_releases(dataset_key);

CREATE INDEX IF NOT EXISTS idx_provider_attributes_provider ON public.provider_attributes(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_attributes_release ON public.provider_attributes(dataset_release_id);
CREATE INDEX IF NOT EXISTS idx_provider_attributes_specialty_state ON public.provider_attributes(normalized_specialty, normalized_state);

CREATE INDEX IF NOT EXISTS idx_peer_group_stats_release_year ON public.peer_group_stats(dataset_release_id, year);
CREATE INDEX IF NOT EXISTS idx_peer_group_stats_group ON public.peer_group_stats(normalized_specialty, normalized_state);

CREATE INDEX IF NOT EXISTS idx_compute_runs_release ON public.compute_runs(dataset_release_id);
CREATE INDEX IF NOT EXISTS idx_compute_runs_status ON public.compute_runs(status);

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_v2_provider ON public.anomaly_flags_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_v2_release ON public.anomaly_flags_v2(dataset_release_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_v2_flagged ON public.anomaly_flags_v2(flagged);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_v2_specialty_state ON public.anomaly_flags_v2(normalized_specialty, normalized_state);

CREATE INDEX IF NOT EXISTS idx_anomaly_flag_years_flag ON public.anomaly_flag_years(anomaly_flag_id);

CREATE INDEX IF NOT EXISTS idx_provider_yearly_metrics_release ON public.provider_yearly_metrics(dataset_release_id);

-- =====================================================
-- NORMALIZATION FUNCTIONS
-- =====================================================

-- State normalization function
CREATE OR REPLACE FUNCTION public.normalize_state(raw_state text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
    cleaned text;
BEGIN
    IF raw_state IS NULL OR TRIM(raw_state) = '' THEN
        RETURN 'UNK';
    END IF;
    
    cleaned := UPPER(TRIM(raw_state));
    
    -- Map common variants to 2-letter codes
    RETURN CASE cleaned
        WHEN 'ALABAMA' THEN 'AL'
        WHEN 'ALASKA' THEN 'AK'
        WHEN 'ARIZONA' THEN 'AZ'
        WHEN 'ARKANSAS' THEN 'AR'
        WHEN 'CALIFORNIA' THEN 'CA'
        WHEN 'COLORADO' THEN 'CO'
        WHEN 'CONNECTICUT' THEN 'CT'
        WHEN 'DELAWARE' THEN 'DE'
        WHEN 'FLORIDA' THEN 'FL'
        WHEN 'GEORGIA' THEN 'GA'
        WHEN 'HAWAII' THEN 'HI'
        WHEN 'IDAHO' THEN 'ID'
        WHEN 'ILLINOIS' THEN 'IL'
        WHEN 'INDIANA' THEN 'IN'
        WHEN 'IOWA' THEN 'IA'
        WHEN 'KANSAS' THEN 'KS'
        WHEN 'KENTUCKY' THEN 'KY'
        WHEN 'LOUISIANA' THEN 'LA'
        WHEN 'MAINE' THEN 'ME'
        WHEN 'MARYLAND' THEN 'MD'
        WHEN 'MASSACHUSETTS' THEN 'MA'
        WHEN 'MICHIGAN' THEN 'MI'
        WHEN 'MINNESOTA' THEN 'MN'
        WHEN 'MISSISSIPPI' THEN 'MS'
        WHEN 'MISSOURI' THEN 'MO'
        WHEN 'MONTANA' THEN 'MT'
        WHEN 'NEBRASKA' THEN 'NE'
        WHEN 'NEVADA' THEN 'NV'
        WHEN 'NEW HAMPSHIRE' THEN 'NH'
        WHEN 'NEW JERSEY' THEN 'NJ'
        WHEN 'NEW MEXICO' THEN 'NM'
        WHEN 'NEW YORK' THEN 'NY'
        WHEN 'NORTH CAROLINA' THEN 'NC'
        WHEN 'NORTH DAKOTA' THEN 'ND'
        WHEN 'OHIO' THEN 'OH'
        WHEN 'OKLAHOMA' THEN 'OK'
        WHEN 'OREGON' THEN 'OR'
        WHEN 'PENNSYLVANIA' THEN 'PA'
        WHEN 'RHODE ISLAND' THEN 'RI'
        WHEN 'SOUTH CAROLINA' THEN 'SC'
        WHEN 'SOUTH DAKOTA' THEN 'SD'
        WHEN 'TENNESSEE' THEN 'TN'
        WHEN 'TEXAS' THEN 'TX'
        WHEN 'UTAH' THEN 'UT'
        WHEN 'VERMONT' THEN 'VT'
        WHEN 'VIRGINIA' THEN 'VA'
        WHEN 'WASHINGTON' THEN 'WA'
        WHEN 'WEST VIRGINIA' THEN 'WV'
        WHEN 'WISCONSIN' THEN 'WI'
        WHEN 'WYOMING' THEN 'WY'
        WHEN 'DISTRICT OF COLUMBIA' THEN 'DC'
        WHEN 'D.C.' THEN 'DC'
        WHEN 'PUERTO RICO' THEN 'PR'
        WHEN 'GUAM' THEN 'GU'
        WHEN 'VIRGIN ISLANDS' THEN 'VI'
        WHEN 'AMERICAN SAMOA' THEN 'AS'
        ELSE 
            -- If already 2 letters, return as-is; otherwise UNK
            CASE WHEN LENGTH(cleaned) = 2 AND cleaned ~ '^[A-Z]{2}$' THEN cleaned ELSE 'UNK' END
    END;
END;
$$;

-- Specialty normalization function
CREATE OR REPLACE FUNCTION public.normalize_specialty(raw_specialty text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
    cleaned text;
    mapped text;
BEGIN
    IF raw_specialty IS NULL OR TRIM(raw_specialty) = '' THEN
        RETURN 'Unknown';
    END IF;
    
    cleaned := TRIM(raw_specialty);
    
    -- Look up in specialty_map
    SELECT sm.normalized_specialty INTO mapped
    FROM public.specialty_map sm
    WHERE sm.raw_value = cleaned AND sm.is_active = true
    LIMIT 1;
    
    IF mapped IS NOT NULL THEN
        RETURN mapped;
    END IF;
    
    -- No mapping found: return trimmed raw value
    RETURN cleaned;
END;
$$;

-- Check if specialty is unmapped
CREATE OR REPLACE FUNCTION public.is_specialty_unmapped(raw_specialty text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
    IF raw_specialty IS NULL OR TRIM(raw_specialty) = '' THEN
        RETURN true;
    END IF;
    
    RETURN NOT EXISTS (
        SELECT 1 FROM public.specialty_map sm
        WHERE sm.raw_value = TRIM(raw_specialty) AND sm.is_active = true
    );
END;
$$;

-- Get active dataset release
CREATE OR REPLACE FUNCTION public.get_active_dataset_release()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
    release_id uuid;
BEGIN
    SELECT id INTO release_id
    FROM public.dataset_releases
    WHERE status = 'active'
    ORDER BY ingested_at DESC
    LIMIT 1;
    
    RETURN release_id;
END;
$$;

-- =====================================================
-- COMPUTE PEER GROUP STATS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.compute_peer_group_stats(
    p_dataset_release_id uuid,
    p_years integer[],
    p_metric_name text DEFAULT 'total_allowed_amount',
    p_peer_group_key text DEFAULT 'specialty_state',
    p_peer_group_version text DEFAULT 'v1'
)
RETURNS TABLE(
    groups_computed integer,
    years_processed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_groups_computed integer := 0;
    v_years_processed integer := 0;
    v_year integer;
BEGIN
    -- Validate dataset release exists
    IF NOT EXISTS (SELECT 1 FROM public.dataset_releases WHERE id = p_dataset_release_id) THEN
        RAISE EXCEPTION 'Dataset release % does not exist', p_dataset_release_id;
    END IF;
    
    -- Delete existing stats for this release/metric/peer_group combination
    DELETE FROM public.peer_group_stats
    WHERE dataset_release_id = p_dataset_release_id
      AND metric_name = p_metric_name
      AND peer_group_key = p_peer_group_key
      AND peer_group_version = p_peer_group_version
      AND year = ANY(p_years);
    
    -- Compute stats for each year
    FOREACH v_year IN ARRAY p_years LOOP
        INSERT INTO public.peer_group_stats (
            dataset_release_id, year, peer_group_key, peer_group_version,
            normalized_specialty, normalized_state, peer_size, metric_name,
            p50, p95, p99, p995, mean
        )
        SELECT
            p_dataset_release_id,
            v_year,
            p_peer_group_key,
            p_peer_group_version,
            pa.normalized_specialty,
            pa.normalized_state,
            COUNT(*)::integer AS peer_size,
            p_metric_name,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p50,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p99,
            PERCENTILE_CONT(0.995) WITHIN GROUP (ORDER BY m.total_allowed_amount) AS p995,
            AVG(m.total_allowed_amount) AS mean
        FROM public.provider_attributes pa
        JOIN public.provider_yearly_metrics m 
            ON m.provider_id = pa.provider_id 
            AND m.year = pa.year
            AND (m.dataset_release_id = p_dataset_release_id OR m.dataset_release_id IS NULL)
        WHERE pa.dataset_release_id = p_dataset_release_id
          AND pa.year = v_year
          AND pa.is_primary_record = true
        GROUP BY pa.normalized_specialty, pa.normalized_state;
        
        v_years_processed := v_years_processed + 1;
    END LOOP;
    
    SELECT COUNT(*) INTO v_groups_computed
    FROM public.peer_group_stats
    WHERE dataset_release_id = p_dataset_release_id
      AND metric_name = p_metric_name
      AND peer_group_key = p_peer_group_key
      AND year = ANY(p_years);
    
    RETURN QUERY SELECT v_groups_computed, v_years_processed;
END;
$$;

-- =====================================================
-- COMPUTE ANOMALY FLAGS V2 FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.compute_anomaly_flags_v2(
    p_dataset_release_id uuid,
    p_years_window integer[] DEFAULT ARRAY[2023, 2024],
    p_threshold_percentile numeric DEFAULT 99.5,
    p_consecutive_years_required integer DEFAULT 2,
    p_min_peer_size_required integer DEFAULT 20,
    p_peer_group_key text DEFAULT 'specialty_state',
    p_peer_group_version text DEFAULT 'v1',
    p_metric_name text DEFAULT 'total_allowed_amount',
    p_rule_set_version text DEFAULT 'outlier_v1.0',
    p_created_by uuid DEFAULT NULL
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
AS $$
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
        
        SELECT 
            COUNT(*) FILTER (WHERE flagged = true),
            COUNT(*) FILTER (WHERE flagged = false)
        INTO v_providers_flagged, v_providers_suppressed
        FROM public.anomaly_flags_v2
        WHERE compute_run_id = v_compute_run_id;
        
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
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.dataset_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialty_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_group_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_group_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compute_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_flags_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_flag_years ENABLE ROW LEVEL SECURITY;

-- DATASET_RELEASES policies
CREATE POLICY "Authenticated users can view active releases"
ON public.dataset_releases FOR SELECT
USING (status = 'active' OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage dataset releases"
ON public.dataset_releases FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- SPECIALTY_MAP policies
CREATE POLICY "Authenticated users can view specialty map"
ON public.specialty_map FOR SELECT
USING (true);

CREATE POLICY "Admins can manage specialty map"
ON public.specialty_map FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- PEER_GROUP_DEFINITIONS policies
CREATE POLICY "Authenticated users can view peer group definitions"
ON public.peer_group_definitions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage peer group definitions"
ON public.peer_group_definitions FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- PROVIDER_ATTRIBUTES policies
CREATE POLICY "Authenticated users can view provider attributes"
ON public.provider_attributes FOR SELECT
USING (true);

CREATE POLICY "Admins can manage provider attributes"
ON public.provider_attributes FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- PEER_GROUP_STATS policies
CREATE POLICY "Authenticated users can view peer group stats"
ON public.peer_group_stats FOR SELECT
USING (true);

CREATE POLICY "Admins can manage peer group stats"
ON public.peer_group_stats FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- COMPUTE_RUNS policies
CREATE POLICY "Admins can view compute runs"
ON public.compute_runs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage compute runs"
ON public.compute_runs FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ANOMALY_FLAGS_V2 policies
CREATE POLICY "Authenticated users can view flagged anomalies"
ON public.anomaly_flags_v2 FOR SELECT
USING (flagged = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage anomaly flags v2"
ON public.anomaly_flags_v2 FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ANOMALY_FLAG_YEARS policies
CREATE POLICY "Authenticated users can view anomaly flag years"
ON public.anomaly_flag_years FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.anomaly_flags_v2 af
        WHERE af.id = anomaly_flag_years.anomaly_flag_id
          AND (af.flagged = true OR has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Admins can manage anomaly flag years"
ON public.anomaly_flag_years FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
