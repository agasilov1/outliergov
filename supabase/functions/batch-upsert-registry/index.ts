import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // NO CORS - this endpoint is not for browser use
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = req.headers.get("x-ingest-token");
  if (!token || token !== Deno.env.get("INGEST_TOKEN")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No rows provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (rows.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Batch too large (max 2000)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate npi exists and is 10 digits
    const invalidRows: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.npi || !/^\d{10}$/.test(String(row.npi))) {
        invalidRows.push(i);
      }
    }

    if (invalidRows.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid rows detected", 
          invalidRowIndexes: invalidRows.slice(0, 10),
          message: "npi must be 10 digits"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Upserting ${rows.length} rows into outlier_registry`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("outlier_registry")
      .upsert(rows, { onConflict: "npi" });

    if (error) {
      console.error("Upsert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ upserted: rows.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
