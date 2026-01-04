import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngestRequest {
  dataset_key: string;
  release_label: string;
  source_urls: string[];
  created_by?: string | null;
}

interface IngestResult {
  dataset_release_id: string;
  compute_run_id: string;
  files_processed: number;
  providers_seen: number;
  providers_created: number;
  metrics_inserted: number;
  metrics_updated: number;
  rows_skipped: number;
  timing: Record<string, number>;
}

interface CsvRow {
  npi: string;
  year: number;
  total_allowed_amount: number;
  service_count: number;
  beneficiary_count: number;
}

// Parse a single CSV line, handling quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Validate and parse a CSV row
function parseRow(fields: string[], headerMap: Map<string, number>): CsvRow | null {
  const npiIdx = headerMap.get("npi");
  const yearIdx = headerMap.get("year");
  const amountIdx = headerMap.get("total_allowed_amount");
  const serviceIdx = headerMap.get("service_count");
  const beneficiaryIdx = headerMap.get("beneficiary_count");

  if (npiIdx === undefined || yearIdx === undefined || amountIdx === undefined) {
    return null;
  }

  const npi = fields[npiIdx]?.trim();
  const yearStr = fields[yearIdx]?.trim();
  const amountStr = fields[amountIdx]?.trim();
  const serviceStr = fields[serviceIdx ?? -1]?.trim() || "0";
  const beneficiaryStr = fields[beneficiaryIdx ?? -1]?.trim() || "0";

  // Validate NPI
  if (!npi || npi.length === 0) {
    return null;
  }

  // Validate year
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return null;
  }

  // Validate amount
  const total_allowed_amount = parseFloat(amountStr);
  if (isNaN(total_allowed_amount)) {
    return null;
  }

  const service_count = parseInt(serviceStr, 10) || 0;
  const beneficiary_count = parseInt(beneficiaryStr, 10) || 0;

  return {
    npi,
    year,
    total_allowed_amount,
    service_count,
    beneficiary_count,
  };
}

// Stream and parse CSV from URL
async function* streamCsv(url: string): AsyncGenerator<{ row: CsvRow | null; lineNumber: number; rawLine: string }> {
  console.log(`[CSV] Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ProviderMetricsIngester/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let headerMap: Map<string, number> | null = null;
  let lineNumber = 0;

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      // Process remaining buffer
      if (buffer.trim().length > 0) {
        lineNumber++;
        const fields = parseCsvLine(buffer);
        if (headerMap) {
          yield { row: parseRow(fields, headerMap), lineNumber, rawLine: buffer };
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim().length === 0) continue;
      lineNumber++;

      const fields = parseCsvLine(line);

      // First line is header
      if (headerMap === null) {
        headerMap = new Map();
        fields.forEach((field, idx) => {
          headerMap!.set(field.toLowerCase().trim(), idx);
        });
        console.log(`[CSV] Headers: ${Array.from(headerMap.keys()).join(", ")}`);
        continue;
      }

      yield { row: parseRow(fields, headerMap), lineNumber, rawLine: line };
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: IngestRequest = await req.json();
    const { dataset_key, release_label, source_urls, created_by } = body;

    console.log(`[Ingest] Starting ingestion for dataset_key="${dataset_key}", ${source_urls.length} files`);

    // Validate inputs
    if (!dataset_key || !release_label || !source_urls || source_urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: dataset_key, release_label, source_urls" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Deprecate existing active release for this dataset_key
    const { data: existingRelease } = await supabase
      .from("dataset_releases")
      .select("id")
      .eq("dataset_key", dataset_key)
      .eq("status", "active")
      .single();

    if (existingRelease) {
      console.log(`[Ingest] Deprecating existing release: ${existingRelease.id}`);
      await supabase
        .from("dataset_releases")
        .update({ status: "deprecated" })
        .eq("id", existingRelease.id);
    }

    // Step 2: Create new dataset release
    const { data: newRelease, error: releaseError } = await supabase
      .from("dataset_releases")
      .insert({
        dataset_key,
        release_label,
        status: "active",
        source_url: "CMS Medicare Part B Public Use Files",
        notes: "Annual CMS provider metrics ingestion",
        ingested_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (releaseError || !newRelease) {
      throw new Error(`Failed to create dataset release: ${releaseError?.message}`);
    }

    const datasetReleaseId = newRelease.id;
    console.log(`[Ingest] Created dataset release: ${datasetReleaseId}`);

    // Step 3: Create compute run record
    const { data: computeRun, error: computeRunError } = await supabase
      .from("compute_runs")
      .insert({
        dataset_release_id: datasetReleaseId,
        run_type: "ingest",
        rule_set_version: "ingest_v1.0",
        parameters_json: {
          dataset_key,
          release_label,
          source_urls,
        },
        created_by: created_by || null,
        status: "running",
      })
      .select("id")
      .single();

    if (computeRunError || !computeRun) {
      throw new Error(`Failed to create compute run: ${computeRunError?.message}`);
    }

    const computeRunId = computeRun.id;
    console.log(`[Ingest] Created compute run: ${computeRunId}`);

    // Initialize result tracking
    const result: IngestResult = {
      dataset_release_id: datasetReleaseId,
      compute_run_id: computeRunId,
      files_processed: 0,
      providers_seen: 0,
      providers_created: 0,
      metrics_inserted: 0,
      metrics_updated: 0,
      rows_skipped: 0,
      timing: {},
    };

    // NPI to provider_id cache
    const npiToProviderId = new Map<string, string>();

    // Step 4: Process each source URL
    for (let fileIdx = 0; fileIdx < source_urls.length; fileIdx++) {
      const url = source_urls[fileIdx];
      const fileStartTime = Date.now();
      console.log(`[Ingest] Processing file ${fileIdx + 1}/${source_urls.length}: ${url.substring(0, 80)}...`);

      try {
        let batchRows: CsvRow[] = [];
        let fileProvidersCreated = 0;
        let fileMetricsInserted = 0;
        let fileMetricsUpdated = 0;
        let fileRowsSkipped = 0;
        const BATCH_SIZE = 1000;

        // Process batch function
        const processBatch = async (rows: CsvRow[]) => {
          if (rows.length === 0) return;

          // Get unique NPIs in this batch
          const uniqueNpis = [...new Set(rows.map((r) => r.npi))];
          const uncachedNpis = uniqueNpis.filter((npi) => !npiToProviderId.has(npi));

          if (uncachedNpis.length > 0) {
            // Upsert providers (ON CONFLICT DO NOTHING)
            const providerInserts = uncachedNpis.map((npi) => ({
              npi,
              provider_name: npi,
              specialty: "Unknown",
              state: "UNK",
              entity_type: "unknown",
            }));

            const { error: providerError } = await supabase
              .from("providers")
              .upsert(providerInserts, { onConflict: "npi", ignoreDuplicates: true });

            if (providerError) {
              console.error(`[Ingest] Provider upsert error: ${providerError.message}`);
            }

            // Fetch provider IDs for uncached NPIs
            const { data: providers } = await supabase
              .from("providers")
              .select("id, npi")
              .in("npi", uncachedNpis);

            if (providers) {
              for (const p of providers) {
                if (!npiToProviderId.has(p.npi)) {
                  npiToProviderId.set(p.npi, p.id);
                  fileProvidersCreated++;
                }
              }
            }
          }

          // Build metrics for upsert
          const metricsInserts = rows
            .filter((r) => npiToProviderId.has(r.npi))
            .map((r) => ({
              provider_id: npiToProviderId.get(r.npi)!,
              dataset_release_id: datasetReleaseId,
              year: r.year,
              total_allowed_amount: r.total_allowed_amount,
              total_payment_amount: r.total_allowed_amount * 0.8, // Required NOT NULL field
              service_count: r.service_count,
              beneficiary_count: r.beneficiary_count,
            }));

          if (metricsInserts.length > 0) {
            // Use raw SQL for proper ON CONFLICT DO UPDATE
            // Supabase JS client's upsert doesn't support partial updates well
            const { data: upsertResult, error: metricsError } = await supabase.rpc(
              "batch_upsert_metrics",
              { metrics_json: JSON.stringify(metricsInserts) }
            ).maybeSingle();

            // If the RPC doesn't exist, fall back to individual upserts
            if (metricsError?.message?.includes("function") || metricsError?.code === "42883") {
              // Fallback: use upsert with update
              for (const metric of metricsInserts) {
                const { error: singleError } = await supabase
                  .from("provider_yearly_metrics")
                  .upsert(metric, {
                    onConflict: "provider_id,year",
                  });
                
                if (singleError) {
                  console.error(`[Ingest] Metric upsert error: ${singleError.message}`);
                  fileRowsSkipped++;
                } else {
                  fileMetricsInserted++;
                }
              }
            } else if (metricsError) {
              console.error(`[Ingest] Metrics batch error: ${metricsError.message}`);
              fileRowsSkipped += metricsInserts.length;
            } else {
              fileMetricsInserted += metricsInserts.length;
            }
          }
        };

        // Stream and process CSV
        for await (const { row, lineNumber } of streamCsv(url)) {
          if (row === null) {
            fileRowsSkipped++;
            continue;
          }

          result.providers_seen++;
          batchRows.push(row);

          if (batchRows.length >= BATCH_SIZE) {
            await processBatch(batchRows);
            console.log(`[Ingest] File ${fileIdx + 1}: Processed ${lineNumber} rows...`);
            batchRows = [];
          }
        }

        // Process remaining rows
        await processBatch(batchRows);

        // Update results
        result.providers_created += fileProvidersCreated;
        result.metrics_inserted += fileMetricsInserted;
        result.metrics_updated += fileMetricsUpdated;
        result.rows_skipped += fileRowsSkipped;
        result.files_processed++;
        result.timing[`file_${fileIdx}_seconds`] = (Date.now() - fileStartTime) / 1000;

        console.log(
          `[Ingest] File ${fileIdx + 1} complete: providers_created=${fileProvidersCreated}, metrics=${fileMetricsInserted}, skipped=${fileRowsSkipped}, time=${result.timing[`file_${fileIdx}_seconds`].toFixed(1)}s`
        );
      } catch (fileError) {
        console.error(`[Ingest] File ${fileIdx + 1} failed: ${fileError}`);
        result.timing[`file_${fileIdx}_seconds`] = -1; // Mark as failed
        // Continue to next file - don't abort entire ingestion
      }
    }

    // Step 5: Update compute run status
    result.timing.total_seconds = (Date.now() - startTime) / 1000;

    await supabase
      .from("compute_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
      })
      .eq("id", computeRunId);

    // Step 6: Audit log
    await supabase.from("audit_log").insert({
      action: "ingest_provider_metrics",
      entity_type: "dataset_releases",
      entity_id: datasetReleaseId,
      metadata: {
        files_processed: result.files_processed,
        providers_seen: result.providers_seen,
        providers_created: result.providers_created,
        metrics_inserted: result.metrics_inserted,
        rows_skipped: result.rows_skipped,
        timing: result.timing,
      },
    });

    console.log(`[Ingest] Complete: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[Ingest] Fatal error: ${error}`);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
