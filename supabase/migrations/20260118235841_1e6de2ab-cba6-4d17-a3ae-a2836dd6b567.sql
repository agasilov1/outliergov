-- Create table (idempotent)
CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, terms_version, privacy_version)
);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Recreate policies safely
DROP POLICY IF EXISTS "Users can view own acceptances" ON public.terms_acceptances;
CREATE POLICY "Users can view own acceptances"
ON public.terms_acceptances
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own acceptances" ON public.terms_acceptances;
CREATE POLICY "Users can insert own acceptances"
ON public.terms_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all acceptances" ON public.terms_acceptances;
CREATE POLICY "Admins can view all acceptances"
ON public.terms_acceptances
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add tracking columns to profiles (idempotent)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_version text,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS privacy_accepted_version text,
ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;