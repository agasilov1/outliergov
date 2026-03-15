import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightSafe(req);
  if (preflight) return preflight;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { npi, name, specialty, state, ratio, drug_pct, years, risk_score, hcpcs_count, trend } = await req.json();

    if (!npi) {
      return new Response(JSON.stringify({ error: "npi is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from("provider_summaries")
      .select("summary")
      .eq("npi", npi)
      .maybeSingle();

    if (cached?.summary) {
      return new Response(JSON.stringify({ summary: cached.summary, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const prompt = `Given this Medicare provider data, write a 2-3 sentence plain-language summary explaining what makes this provider a statistical outlier. Do not allege fraud or wrongdoing. Focus on describing the pattern factually.

Provider: ${name || "Unknown"}
Specialty: ${specialty || "Unknown"}
State: ${state || "Unknown"}
Ratio to peer median: ${ratio != null ? ratio + "x" : "N/A"}
Drug billing percentage: ${drug_pct != null ? drug_pct + "%" : "N/A"}
Years as outlier: ${years ?? "N/A"}
Beneficiary avg risk score: ${risk_score ?? "N/A"}
Distinct HCPCS codes: ${hcpcs_count ?? "N/A"}
Trend: ${trend || "N/A"}`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a healthcare data analyst. Write concise, factual summaries. Never allege fraud, wrongdoing, or intent. Use neutral language." },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiRes.json();
    const summary = openaiData.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache in DB
    await supabaseAdmin.from("provider_summaries").upsert({
      npi,
      summary,
      model: "gpt-4o-mini",
      prompt_hash: null,
    });

    return new Response(JSON.stringify({ summary, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-provider-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
