import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

interface ComputeStatsParams {
  datasetReleaseId?: string;
  years?: number[];
  metricName?: string;
  peerGroupKey?: string;
  peerGroupVersion?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightSafe(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse parameters from request body
    const body: ComputeStatsParams = await req.json().catch(() => ({}));
    
    // Get active dataset release if not specified
    let datasetReleaseId = body.datasetReleaseId;
    if (!datasetReleaseId) {
      const { data: activeRelease, error: releaseError } = await supabaseAdmin
        .from('dataset_releases')
        .select('id')
        .eq('status', 'active')
        .order('ingested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (releaseError || !activeRelease) {
        return new Response(
          JSON.stringify({ error: 'No active dataset release found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      datasetReleaseId = activeRelease.id;
    }

    // Determine years - default to all available years in the release
    let years = body.years;
    if (!years || years.length === 0) {
      const { data: yearsData, error: yearsError } = await supabaseAdmin
        .from('provider_attributes')
        .select('year')
        .eq('dataset_release_id', datasetReleaseId);
      
      if (yearsError || !yearsData || yearsData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No data found for the specified dataset release' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      years = [...new Set(yearsData.map(y => y.year))].sort((a, b) => a - b);
    }

    const metricName = body.metricName ?? 'total_allowed_amount';
    const peerGroupKey = body.peerGroupKey ?? 'specialty_state';
    const peerGroupVersion = body.peerGroupVersion ?? 'v1';

    console.log('Computing peer group stats with params:', {
      datasetReleaseId,
      years,
      metricName,
      peerGroupKey,
      peerGroupVersion
    });

    // Create compute run record
    const { data: computeRunData, error: runError } = await supabaseAdmin
      .from('compute_runs')
      .insert({
        dataset_release_id: datasetReleaseId,
        run_type: 'compute_stats',
        rule_set_version: 'stats_v1.0',
        parameters_json: {
          years,
          metric_name: metricName,
          peer_group_key: peerGroupKey,
          peer_group_version: peerGroupVersion
        },
        created_by: user.id,
        status: 'running'
      })
      .select('id')
      .single();

    if (runError) {
      throw new Error(`Failed to create compute run: ${runError.message}`);
    }

    const computeRunId = computeRunData.id;

    try {
      // Call the database function to compute stats
      const { data: result, error: computeError } = await supabaseAdmin
        .rpc('compute_peer_group_stats', {
          p_dataset_release_id: datasetReleaseId,
          p_years: years,
          p_metric_name: metricName,
          p_peer_group_key: peerGroupKey,
          p_peer_group_version: peerGroupVersion
        });

      if (computeError) {
        throw new Error(computeError.message || JSON.stringify(computeError));
      }

      console.log('Peer group stats computation result:', result);

      const stats = result && result.length > 0 ? result[0] : {
        groups_computed: 0,
        years_processed: 0
      };

      // Get size distribution for reporting
      const { data: sizeData } = await supabaseAdmin
        .from('peer_group_stats')
        .select('peer_size')
        .eq('dataset_release_id', datasetReleaseId)
        .eq('metric_name', metricName)
        .eq('peer_group_key', peerGroupKey);

      const sizes = sizeData?.map(s => s.peer_size) || [];
      const sizeDistribution = {
        min: Math.min(...sizes),
        max: Math.max(...sizes),
        median: sizes.length > 0 ? sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)] : 0,
        below_20: sizes.filter(s => s < 20).length,
        total: sizes.length
      };

      // Update compute run as successful
      await supabaseAdmin
        .from('compute_runs')
        .update({ 
          status: 'success', 
          finished_at: new Date().toISOString() 
        })
        .eq('id', computeRunId);

      // Log to audit
      await supabaseAdmin.from('audit_log').insert({
        user_id: user.id,
        action: 'compute_peer_stats',
        entity_type: 'peer_group_stats',
        entity_id: computeRunId,
        metadata: {
          dataset_release_id: datasetReleaseId,
          years,
          metric_name: metricName,
          peer_group_key: peerGroupKey,
          peer_group_version: peerGroupVersion,
          groups_computed: stats.groups_computed,
          size_distribution: sizeDistribution
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          dataset_release_id: datasetReleaseId,
          compute_run_id: computeRunId,
          years,
          parameters: {
            metric_name: metricName,
            peer_group_key: peerGroupKey,
            peer_group_version: peerGroupVersion
          },
          results: {
            groups_computed: stats.groups_computed,
            years_processed: stats.years_processed,
            size_distribution: sizeDistribution
          },
          computed_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (computeError) {
      // Mark compute run as failed
      await supabaseAdmin
        .from('compute_runs')
        .update({ 
          status: 'failed', 
          finished_at: new Date().toISOString(),
          error_message: computeError instanceof Error ? computeError.message : String(computeError)
        })
        .eq('id', computeRunId);
      
      throw computeError;
    }

  } catch (error) {
    console.error('Error in compute-peer-stats:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
