import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Starting anomaly computation...');

    // Call the compute_anomaly_flags function
    const { data: result, error: computeError } = await supabaseAdmin
      .rpc('compute_anomaly_flags');

    if (computeError) {
      console.error('Error computing anomaly flags:', computeError);
      throw new Error(computeError.message || JSON.stringify(computeError));
    }

    console.log('Anomaly computation result:', result);

    // Get the first row of results (the function returns a table)
    const stats = result && result.length > 0 ? result[0] : {
      providers_analyzed: 0,
      peer_groups_analyzed: 0,
      providers_flagged: 0
    };

    // Log the recompute action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'recompute_anomalies',
      entity_type: 'anomaly_flags',
      metadata: {
        providers_analyzed: stats.providers_analyzed,
        peer_groups_analyzed: stats.peer_groups_analyzed,
        providers_flagged: stats.providers_flagged,
        rule_version: 'v1.0'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        providers_analyzed: stats.providers_analyzed,
        peer_groups_analyzed: stats.peer_groups_analyzed,
        providers_flagged: stats.providers_flagged,
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
