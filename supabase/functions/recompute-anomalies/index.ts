import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComputeParams {
  datasetReleaseId?: string;
  yearsWindow?: number[];
  thresholdPercentile?: number;
  consecutiveYearsRequired?: number;
  minPeerSizeRequired?: number;
  peerGroupKey?: string;
  peerGroupVersion?: string;
  metricName?: string;
  ruleSetVersion?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const body: ComputeParams = await req.json().catch(() => ({}));
    
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
          JSON.stringify({ error: 'No active dataset release found. Please seed data first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      datasetReleaseId = activeRelease.id;
    }

    // Determine years window - default to latest 2 years in the release
    let yearsWindow = body.yearsWindow;
    if (!yearsWindow || yearsWindow.length === 0) {
      const { data: yearsData, error: yearsError } = await supabaseAdmin
        .from('provider_yearly_metrics')
        .select('year')
        .eq('dataset_release_id', datasetReleaseId)
        .order('year', { ascending: false });
      
      if (yearsError || !yearsData || yearsData.length === 0) {
        // Fallback: check provider_attributes
        const { data: attrYears } = await supabaseAdmin
          .from('provider_attributes')
          .select('year')
          .eq('dataset_release_id', datasetReleaseId)
          .order('year', { ascending: false });
        
        if (!attrYears || attrYears.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No data found for the specified dataset release' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const uniqueYears = [...new Set(attrYears.map(y => y.year))].sort((a, b) => b - a);
        yearsWindow = uniqueYears.slice(0, 2).sort((a, b) => a - b);
      } else {
        const uniqueYears = [...new Set(yearsData.map(y => y.year))].sort((a, b) => b - a);
        yearsWindow = uniqueYears.slice(0, 2).sort((a, b) => a - b);
      }
    }

    // Set defaults for other parameters
    const thresholdPercentile = body.thresholdPercentile ?? 99.5;
    const consecutiveYearsRequired = body.consecutiveYearsRequired ?? 2;
    const minPeerSizeRequired = body.minPeerSizeRequired ?? 20;
    const peerGroupKey = body.peerGroupKey ?? 'specialty_state';
    const peerGroupVersion = body.peerGroupVersion ?? 'v1';
    const metricName = body.metricName ?? 'total_allowed_amount';
    const ruleSetVersion = body.ruleSetVersion ?? 'outlier_v1.0';

    console.log('Starting anomaly computation with params:', {
      datasetReleaseId,
      yearsWindow,
      thresholdPercentile,
      consecutiveYearsRequired,
      minPeerSizeRequired,
      peerGroupKey,
      peerGroupVersion,
      metricName,
      ruleSetVersion
    });

    // First, ensure peer group stats exist for the years
    console.log('Computing/refreshing peer group stats...');
    const { data: statsResult, error: statsError } = await supabaseAdmin
      .rpc('compute_peer_group_stats', {
        p_dataset_release_id: datasetReleaseId,
        p_years: yearsWindow,
        p_metric_name: metricName,
        p_peer_group_key: peerGroupKey,
        p_peer_group_version: peerGroupVersion
      });

    if (statsError) {
      console.error('Error computing peer group stats:', statsError);
      throw new Error(`Failed to compute peer group stats: ${statsError.message}`);
    }
    console.log('Peer group stats result:', statsResult);

    // Now compute anomaly flags using the v2 function
    console.log('Computing anomaly flags...');
    const { data: result, error: computeError } = await supabaseAdmin
      .rpc('compute_anomaly_flags_v2', {
        p_dataset_release_id: datasetReleaseId,
        p_years_window: yearsWindow,
        p_threshold_percentile: thresholdPercentile,
        p_consecutive_years_required: consecutiveYearsRequired,
        p_min_peer_size_required: minPeerSizeRequired,
        p_peer_group_key: peerGroupKey,
        p_peer_group_version: peerGroupVersion,
        p_metric_name: metricName,
        p_rule_set_version: ruleSetVersion,
        p_created_by: user.id
      });

    if (computeError) {
      console.error('Error computing anomaly flags:', computeError);
      throw new Error(computeError.message || JSON.stringify(computeError));
    }

    console.log('Anomaly computation result:', result);

    // Get the results (function returns a table with one row)
    const stats = result && result.length > 0 ? result[0] : {
      providers_analyzed: 0,
      peer_groups_analyzed: 0,
      providers_flagged: 0,
      providers_suppressed_low_sample: 0,
      compute_run_id: null
    };

    // Also update legacy anomaly_flags table for backward compatibility
    // This keeps the old UI working during transition
    console.log('Updating legacy anomaly_flags table...');
    const { error: legacyError } = await supabaseAdmin.rpc('compute_anomaly_flags');
    if (legacyError) {
      console.warn('Warning: Failed to update legacy anomaly_flags table:', legacyError);
      // Don't fail the whole operation for legacy table
    }

    // Log the recompute action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'recompute_anomalies_v2',
      entity_type: 'anomaly_flags_v2',
      entity_id: stats.compute_run_id,
      metadata: {
        dataset_release_id: datasetReleaseId,
        years_window: yearsWindow,
        threshold_percentile: thresholdPercentile,
        consecutive_years_required: consecutiveYearsRequired,
        min_peer_size_required: minPeerSizeRequired,
        peer_group_key: peerGroupKey,
        peer_group_version: peerGroupVersion,
        metric_name: metricName,
        rule_set_version: ruleSetVersion,
        providers_analyzed: stats.providers_analyzed,
        peer_groups_analyzed: stats.peer_groups_analyzed,
        providers_flagged: stats.providers_flagged,
        providers_suppressed: stats.providers_suppressed_low_sample
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        dataset_release_id: datasetReleaseId,
        compute_run_id: stats.compute_run_id,
        years_window: yearsWindow,
        parameters: {
          threshold_percentile: thresholdPercentile,
          consecutive_years_required: consecutiveYearsRequired,
          min_peer_size_required: minPeerSizeRequired,
          peer_group_key: peerGroupKey,
          peer_group_version: peerGroupVersion,
          metric_name: metricName,
          rule_set_version: ruleSetVersion
        },
        results: {
          providers_analyzed: stats.providers_analyzed,
          peer_groups_analyzed: stats.peer_groups_analyzed,
          providers_flagged: stats.providers_flagged,
          providers_suppressed_low_sample: stats.providers_suppressed_low_sample
        },
        computed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recompute-anomalies:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
