-- Efficient year range function (single table scan)
CREATE OR REPLACE FUNCTION get_data_year_range()
RETURNS TABLE(min_year integer, max_year integer)
LANGUAGE sql STABLE
AS $$
  SELECT min(year), max(year) FROM provider_year_metrics;
$$;