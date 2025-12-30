-- Invitations table for magic link tokens
CREATE TABLE public.invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    role app_role NOT NULL DEFAULT 'firm_user',
    firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
    invited_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '7 days'),
    accepted_at timestamptz,
    accepted_by uuid
);

-- Create index for token lookup
CREATE INDEX idx_invitations_token ON public.invitations(token);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));