import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InputRow {
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
  entity_type: string;
  year: number;
  total_allowed_amount: number;
  total_payment_amount: number;
  service_count: number;
  beneficiary_count: number;
}

interface RequestPayload {
  rows: InputRow[];
  dataset_release_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rows, dataset_release_id }: RequestPayload = await req.json();

    // Validation
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No rows provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Batch size exceeds 2000 row limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dataset_release_id) {
      return new Response(
        JSON.stringify({ error: "dataset_release_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Bulk upsert providers by npi and get IDs via RETURNING
    const providerRecords = rows.map((row) => ({
      npi: row.npi,
      provider_name: row.provider_name,
      specialty: row.specialty,
      state: row.state,
      entity_type: row.entity_type || "unknown",
    }));

    const { data: providers, error: providerError } = await supabaseAdmin
      .from("providers")
      .upsert(providerRecords, { onConflict: "npi", ignoreDuplicates: false })
      .select("id, npi");

    if (providerError) {
      console.error("Provider upsert error:", providerError);
      return new Response(
        JSON.stringify({ error: `Provider upsert failed: ${providerError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const npiToId = new Map(providers?.map((p) => [p.npi, p.id]) || []);

    // 3. Bulk upsert provider_yearly_metrics by (provider_id, year)
    const metricsRecords = rows
      .filter((row) => npiToId.has(row.npi))
      .map((row) => ({
        provider_id: npiToId.get(row.npi)!,
        year: row.year,
        total_allowed_amount: row.total_allowed_amount,
        total_payment_amount: row.total_payment_amount,
        service_count: row.service_count,
        beneficiary_count: row.beneficiary_count,
        dataset_release_id: dataset_release_id,
      }));

    const { error: metricsError } = await supabaseAdmin
      .from("provider_yearly_metrics")
      .upsert(metricsRecords, { onConflict: "provider_id,year", ignoreDuplicates: false });

    if (metricsError) {
      console.error("Metrics upsert error:", metricsError);
      return new Response(
        JSON.stringify({ error: `Metrics upsert failed: ${metricsError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        providers_upserted: providerRecords.length,
        metrics_upserted: metricsRecords.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
