ALTER TABLE outlier_registry ADD COLUMN IF NOT EXISTS is_institutional boolean DEFAULT false;

UPDATE outlier_registry
SET is_institutional = (
  coalesce(specialty, '') ILIKE '%Ambulatory Surgical Center%'
  OR coalesce(specialty, '') ILIKE '%Hospital%'
  OR coalesce(specialty, '') ILIKE '%Skilled Nursing Facility%'
  OR coalesce(specialty, '') ILIKE '%Clinical Laboratory%'
  OR coalesce(specialty, '') ILIKE '%Ambulance Service%'
  OR coalesce(specialty, '') ILIKE '%Portable X-ray%'
  OR coalesce(specialty, '') ILIKE '%Pharmacy%'
  OR coalesce(specialty, '') ILIKE '%Durable Medical Equipment%'
  OR coalesce(specialty, '') ILIKE '%Mass Immunization%'
  OR coalesce(specialty, '') ILIKE '%Federally Qualified Health Center%'
  OR coalesce(specialty, '') ILIKE '%All Other Suppliers%'
  OR coalesce(specialty, '') ILIKE '%Unknown Supplier%'
);

CREATE INDEX IF NOT EXISTS idx_outlier_registry_is_institutional ON outlier_registry(is_institutional);