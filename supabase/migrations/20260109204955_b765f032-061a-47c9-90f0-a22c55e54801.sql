-- Add expiration columns to firms table
ALTER TABLE public.firms 
ADD COLUMN expired boolean DEFAULT false,
ADD COLUMN expired_reason text,
ADD COLUMN expired_at timestamp with time zone;