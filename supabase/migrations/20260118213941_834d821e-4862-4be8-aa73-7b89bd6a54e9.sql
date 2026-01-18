-- Fix function with explicit search_path for security
CREATE OR REPLACE FUNCTION get_data_year_range()
RETURNS TABLE(min_year integer, max_year integer)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT min(year), max(year) FROM provider_year_metrics;
$$;