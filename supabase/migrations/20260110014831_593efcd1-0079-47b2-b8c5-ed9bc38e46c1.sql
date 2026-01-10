-- Block expired users from sensitive tables
-- This does NOT restrict current active users, only those with profiles.expired = true

-- Block expired users from anomalies_offline
DROP POLICY IF EXISTS "Authenticated users can view anomalies_offline" ON anomalies_offline;

CREATE POLICY "Active authenticated users can view anomalies_offline" ON anomalies_offline
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.expired = true
    )
  );

-- Block expired users from provider_yearly_metrics  
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON provider_yearly_metrics;

CREATE POLICY "Active authenticated users can view metrics" ON provider_yearly_metrics
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.expired = true
    )
  );