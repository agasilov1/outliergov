-- Add expired and expired_reason columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expired boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expired_reason text;

-- Update RLS policies for profiles to allow admins to update expired status
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));