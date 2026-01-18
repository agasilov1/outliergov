-- Add index for fast year lookups
CREATE INDEX IF NOT EXISTS idx_provider_year_metrics_year
ON public.provider_year_metrics(year);

-- Replace aggregate function with ORDER BY + LIMIT approach
CREATE OR REPLACE FUNCTION public.get_data_year_range()
RETURNS TABLE(min_year integer, max_year integer)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    (SELECT year FROM public.provider_year_metrics ORDER BY year ASC LIMIT 1) AS min_year,
    (SELECT year FROM public.provider_year_metrics ORDER BY year DESC LIMIT 1) AS max_year;
$$;