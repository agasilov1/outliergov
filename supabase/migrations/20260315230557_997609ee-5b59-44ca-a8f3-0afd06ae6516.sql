CREATE TABLE public.provider_summaries (
  npi text PRIMARY KEY,
  summary text NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.provider_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view summaries" ON public.provider_summaries FOR SELECT TO anon, authenticated USING (true);