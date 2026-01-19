import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightSafe(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // SECURITY: Require ingest token for authentication
  const token = req.headers.get("x-ingest-token");
  if (!token || token !== Deno.env.get("INGEST_TOKEN")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No rows provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inserting ${rows.length} rows into anomalies_offline`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("anomalies_offline")
      .insert(rows);

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully inserted ${rows.length} rows`);

    return new Response(
      JSON.stringify({ inserted: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
