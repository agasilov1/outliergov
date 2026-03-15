

## Plan: AI-Powered Provider Summaries (OpenAI GPT-4o-mini)

### Architecture

User opens provider profile → check `provider_summaries` table for cached result → if miss, call edge function → edge function calls OpenAI → cache in DB → display on page.

### 1. Add OpenAI API Key as Secret

Use the `add_secret` tool to request `OPENAI_API_KEY` from the user.

### 2. Database: Create `provider_summaries` Cache Table (Migration)

```sql
CREATE TABLE public.provider_summaries (
  npi text PRIMARY KEY,
  summary text NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.provider_summaries ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public tool)
CREATE POLICY "Public can view summaries" ON public.provider_summaries FOR SELECT TO anon, authenticated USING (true);

-- Edge function uses service role to insert, so no insert policy needed for users
```

### 3. Edge Function: `generate-provider-summary` (NEW)

- `verify_jwt = false` in config.toml
- Accepts `{ npi, name, specialty, state, ratio, drug_pct, years, risk_score, hcpcs_count, trend }` in POST body
- Checks `provider_summaries` table first — if cached, returns it
- If not cached, calls OpenAI `gpt-4o-mini` with the prompt template provided
- Upserts result into `provider_summaries`
- Returns summary text

### 4. Update `src/pages/ProviderDetail.tsx`

- After metrics data loads, compute trend direction from flagYears (increasing/decreasing/stable)
- Call the edge function via `supabase.functions.invoke('generate-provider-summary', { body: {...} })`
- Use React Query with `staleTime: Infinity` (already cached server-side)
- Display the summary in a new Card between the Verification Statement and Peer Group Snapshot
- Show a skeleton loader while generating
- Show a subtle "AI-generated summary" label

### 5. Update `supabase/config.toml`

Add `[functions.generate-provider-summary]` with `verify_jwt = false`.

---

### Files

| File | Action |
|------|--------|
| `supabase/functions/generate-provider-summary/index.ts` | Create |
| `supabase/config.toml` | Add function entry |
| `src/pages/ProviderDetail.tsx` | Add summary section |
| Database migration | Create `provider_summaries` table |

