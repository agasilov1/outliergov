
-- Add anon SELECT policy to outlier_registry (public CMS data)
CREATE POLICY "Public can view outlier_registry"
  ON public.outlier_registry
  FOR SELECT
  TO anon
  USING (true);

-- Add anon SELECT policy to provider_year_metrics (public CMS data)
CREATE POLICY "Public can view provider_year_metrics"
  ON public.provider_year_metrics
  FOR SELECT
  TO anon
  USING (true);
