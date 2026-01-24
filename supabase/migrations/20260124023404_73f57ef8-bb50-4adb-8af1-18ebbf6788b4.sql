-- Idempotent drop (handles any policy name mismatch)
DROP POLICY IF EXISTS "Authenticated users can view firms" ON public.firms;

-- Restrictive policy: users see only their own firm, admins see all
CREATE POLICY "Users can view their own firm"
ON public.firms
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.firm_id = public.firms.id
  )
);