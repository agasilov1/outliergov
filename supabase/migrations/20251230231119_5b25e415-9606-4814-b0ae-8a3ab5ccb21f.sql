-- Providers table for synthetic Medicare-style data
CREATE TABLE public.providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    npi text NOT NULL UNIQUE,
    provider_name text NOT NULL,
    specialty text NOT NULL,
    state text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Yearly metrics for each provider (2023 and 2024)
CREATE TABLE public.provider_yearly_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
    year integer NOT NULL,
    total_allowed_amount numeric(15,2) NOT NULL,
    total_payment_amount numeric(15,2) NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (provider_id, year)
);

-- Anomaly flags computed by the detection algorithm
CREATE TABLE public.anomaly_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL UNIQUE,
    specialty text NOT NULL,
    state text NOT NULL,
    percentile_2023 numeric(7,4) NOT NULL,
    percentile_2024 numeric(7,4) NOT NULL,
    threshold_2023 numeric(15,2) NOT NULL,
    threshold_2024 numeric(15,2) NOT NULL,
    peer_group_size integer NOT NULL,
    rule_version text NOT NULL DEFAULT 'v1.0',
    computed_at timestamptz DEFAULT now()
);

-- Indexes for peer group queries
CREATE INDEX idx_providers_specialty_state ON public.providers(specialty, state);
CREATE INDEX idx_metrics_provider_year ON public.provider_yearly_metrics(provider_id, year);
CREATE INDEX idx_anomaly_flags_specialty_state ON public.anomaly_flags(specialty, state);

-- Enable RLS on all tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_yearly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_flags ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read providers
CREATE POLICY "Authenticated users can view providers" 
ON public.providers 
FOR SELECT 
TO authenticated 
USING (true);

-- RLS: Admins can manage providers
CREATE POLICY "Admins can manage providers" 
ON public.providers 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Authenticated users can read metrics
CREATE POLICY "Authenticated users can view metrics" 
ON public.provider_yearly_metrics 
FOR SELECT 
TO authenticated 
USING (true);

-- RLS: Admins can manage metrics
CREATE POLICY "Admins can manage metrics" 
ON public.provider_yearly_metrics 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Authenticated users can read anomaly flags
CREATE POLICY "Authenticated users can view anomaly flags" 
ON public.anomaly_flags 
FOR SELECT 
TO authenticated 
USING (true);

-- RLS: Admins can manage anomaly flags
CREATE POLICY "Admins can manage anomaly flags" 
ON public.anomaly_flags 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to compute anomaly flags
-- Rule: Flag providers at >= 99.5th percentile in BOTH 2023 AND 2024 within their specialty+state peer group
CREATE OR REPLACE FUNCTION public.compute_anomaly_flags()
RETURNS TABLE (
    providers_analyzed integer,
    peer_groups_analyzed integer,
    providers_flagged integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_providers_analyzed integer;
    v_peer_groups_analyzed integer;
    v_providers_flagged integer;
BEGIN
    -- Clear existing flags
    DELETE FROM public.anomaly_flags;
    
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
$$;