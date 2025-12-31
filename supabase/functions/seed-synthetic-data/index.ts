import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deterministic seeded random number generator (mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution
function normalRandom(rand: () => number, mean: number, stdDev: number): number {
  const u1 = rand();
  const u2 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Log-normal distribution
function logNormalRandom(rand: () => number, logMean: number, logStdDev: number): number {
  const normalVal = normalRandom(rand, logMean, logStdDev);
  return Math.exp(normalVal);
}

const SPECIALTIES = [
  'Internal Medicine',
  'Family Practice',
  'Cardiology',
  'Orthopedic Surgery',
  'Oncology - Medical',
  'Gastroenterology',
  'Ophthalmology',
  'Dermatology',
  'Psychiatry',
  'Pulmonary Disease',
  'Nephrology',
  'Neurology',
  'Rheumatology',
  'Urology',
  'General Surgery',
  'Interventional Pain Management',
  'Physical Medicine and Rehabilitation',
  'Endocrinology',
  'Infectious Disease',
  'Hematology'
];

// States with varied weights to create different peer group sizes
// Large states: many providers (peer groups > 30)
// Medium states: moderate providers (peer groups 20-30)
// Small states: few providers (peer groups 10-19, should be suppressed)
// Rare states: very few providers (peer groups 5-9)
const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Adjusted weights to create varied peer group sizes for guardrail testing
const STATE_WEIGHTS: Record<string, number> = {
  // Large states - will have adequate peer groups
  'CA': 15, 'TX': 12, 'FL': 11, 'NY': 11, 'PA': 8,
  'IL': 7, 'OH': 7, 'GA': 6, 'NC': 6, 'MI': 6,
  // Medium states - borderline peer groups
  'NJ': 5, 'VA': 4, 'WA': 4, 'AZ': 4, 'MA': 4,
  'TN': 3, 'IN': 3, 'MO': 3, 'MD': 3, 'WI': 3,
  'CO': 3, 'MN': 3, 'SC': 2, 'AL': 2, 'LA': 2,
  // Smaller states - will create low-sample peer groups
  'KY': 1.5, 'OR': 1.5, 'OK': 1.2, 'CT': 1.2, 'UT': 1,
  'IA': 1, 'NV': 1, 'AR': 1, 'MS': 1, 'KS': 0.8,
  // Very small states - will create very low-sample groups
  'NM': 0.5, 'NE': 0.5, 'ID': 0.4, 'WV': 0.4, 'HI': 0.4,
  'NH': 0.3, 'ME': 0.3, 'MT': 0.25, 'RI': 0.25, 'DE': 0.2,
  'SD': 0.15, 'ND': 0.15, 'AK': 0.1, 'VT': 0.1, 'WY': 0.08
};

const FIRST_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
  'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda',
  'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia',
  'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald',
  'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric',
  'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy'
];

function generateNPI(rand: () => number, index: number): string {
  const prefix = Math.floor(rand() * 2) + 1;
  const suffix = String(index).padStart(9, '0');
  return `${prefix}${suffix}`;
}

function selectWeighted(rand: () => number, items: string[], weights: Record<string, number>): string {
  const totalWeight = items.reduce((sum, item) => sum + (weights[item] || 1), 0);
  let r = rand() * totalWeight;
  
  for (const item of items) {
    r -= weights[item] || 1;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
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

    console.log('Starting synthetic data seeding with new schema...');

    // Clear existing data in order (respecting foreign keys)
    console.log('Clearing existing data...');
    await supabaseAdmin.from('anomaly_flag_years').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('anomaly_flags_v2').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('anomaly_flags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('peer_group_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_attributes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_yearly_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('providers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Deprecate existing active releases
    await supabaseAdmin
      .from('dataset_releases')
      .update({ status: 'deprecated' })
      .eq('status', 'active');
    
    console.log('Cleared existing data');

    // Create new dataset release
    const releaseLabel = `Synthetic Dataset ${new Date().toISOString().split('T')[0]}`;
    const { data: datasetRelease, error: releaseError } = await supabaseAdmin
      .from('dataset_releases')
      .insert({
        dataset_key: 'synthetic_v1',
        release_label: releaseLabel,
        status: 'active',
        notes: 'Synthetic data for testing anomaly detection with varied peer group sizes',
        source_url: null,
        ingested_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (releaseError || !datasetRelease) {
      console.error('Error creating dataset release:', releaseError);
      throw new Error('Failed to create dataset release');
    }

    console.log('Created dataset release:', datasetRelease.id);

    // Create a compute run record for seeding
    const { data: computeRun, error: computeRunError } = await supabaseAdmin
      .from('compute_runs')
      .insert({
        run_type: 'seed',
        status: 'running',
        dataset_release_id: datasetRelease.id,
        rule_set_version: 'synthetic_v1.0',
        created_by: user.id,
        parameters_json: {
          seed: 12345,
          provider_count: 5000,
          years: [2023, 2024]
        },
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (computeRunError) {
      console.error('Error creating compute run:', computeRunError);
    }

    // Fixed seed for deterministic generation
    const SEED = 12345;
    const rand = mulberry32(SEED);

    const PROVIDER_COUNT = 5000;
    const providers: { npi: string; provider_name: string; specialty: string; state: string; entity_type: string }[] = [];
    
    // Track which providers will be outliers
    const outlierIndices = new Set<number>();
    
    // Pre-determine ~0.7% as persistent outliers
    for (let i = 0; i < PROVIDER_COUNT; i++) {
      if (rand() < 0.007) {
        outlierIndices.add(i);
      }
    }

    console.log(`Pre-determined ${outlierIndices.size} persistent outliers`);

    // Generate providers with varied specialty/state to create different peer group sizes
    for (let i = 0; i < PROVIDER_COUNT; i++) {
      const specialty = SPECIALTIES[Math.floor(rand() * SPECIALTIES.length)];
      const state = selectWeighted(rand, STATES, STATE_WEIGHTS);
      const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      
      providers.push({
        npi: generateNPI(rand, i + 1),
        provider_name: `${firstName} ${lastName}, MD`,
        specialty,
        state,
        entity_type: rand() < 0.95 ? 'individual' : 'organization'
      });
    }

    console.log(`Generated ${providers.length} providers`);

    // Insert providers in batches
    const BATCH_SIZE = 500;
    const insertedProviders: { id: string }[] = [];
    
    for (let i = 0; i < providers.length; i += BATCH_SIZE) {
      const batch = providers.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabaseAdmin
        .from('providers')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error('Error inserting providers batch:', error);
        throw error;
      }
      insertedProviders.push(...(data || []));
    }

    console.log(`Inserted ${insertedProviders.length} providers`);

    // Generate metrics and provider_attributes for each provider
    const LOG_MEAN = 11.92; // ~$150k median
    const LOG_STD_DEV = 1.2;
    
    const metrics: {
      provider_id: string;
      year: number;
      total_allowed_amount: number;
      total_payment_amount: number;
      dataset_release_id: string;
      service_count: number;
      beneficiary_count: number;
    }[] = [];
    
    const providerAttributes: {
      provider_id: string;
      dataset_release_id: string;
      year: number;
      normalized_specialty: string;
      normalized_state: string;
      raw_specialty: string;
      raw_state: string;
      provider_display_name: string;
      is_primary_record: boolean;
    }[] = [];

    for (let i = 0; i < insertedProviders.length; i++) {
      const providerId = insertedProviders[i].id;
      const providerData = providers[i];
      const isOutlier = outlierIndices.has(i);

      for (const year of [2023, 2024]) {
        let amount: number;
        
        if (isOutlier) {
          // Outliers: consistently high across both years
          amount = logNormalRandom(rand, LOG_MEAN + 2.5, 0.5);
          const yearVariation = 0.85 + rand() * 0.3;
          amount *= yearVariation;
        } else {
          amount = logNormalRandom(rand, LOG_MEAN, LOG_STD_DEV);
        }

        // Ensure minimum of $10,000 and cap at $15M
        amount = Math.max(10000, Math.min(15000000, amount));
        
        // Generate correlated service and beneficiary counts
        const avgServiceAmount = 200 + rand() * 300; // $200-500 per service
        const serviceCount = Math.round(amount / avgServiceAmount);
        const servicesPerBeneficiary = 3 + rand() * 7; // 3-10 services per beneficiary
        const beneficiaryCount = Math.round(serviceCount / servicesPerBeneficiary);
        
        metrics.push({
          provider_id: providerId,
          year,
          total_allowed_amount: Math.round(amount * 100) / 100,
          total_payment_amount: Math.round(amount * 0.8 * 100) / 100, // 80% of allowed
          dataset_release_id: datasetRelease.id,
          service_count: serviceCount,
          beneficiary_count: beneficiaryCount
        });

        // Add provider attributes (using the raw values which should match specialty_map)
        providerAttributes.push({
          provider_id: providerId,
          dataset_release_id: datasetRelease.id,
          year,
          normalized_specialty: providerData.specialty, // These match our static list
          normalized_state: providerData.state,
          raw_specialty: providerData.specialty,
          raw_state: providerData.state,
          provider_display_name: providerData.provider_name,
          is_primary_record: true
        });
      }
    }

    console.log(`Generated ${metrics.length} yearly metrics`);
    console.log(`Generated ${providerAttributes.length} provider attributes`);

    // Insert metrics in batches
    for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
      const batch = metrics.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin
        .from('provider_yearly_metrics')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting metrics batch:', error);
        throw error;
      }
    }

    console.log('Inserted all metrics');

    // Insert provider_attributes in batches
    for (let i = 0; i < providerAttributes.length; i += BATCH_SIZE) {
      const batch = providerAttributes.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin
        .from('provider_attributes')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting provider_attributes batch:', error);
        throw error;
      }
    }

    console.log('Inserted all provider attributes');

    // Count peer group sizes for reporting
    const peerGroupSizes = new Map<string, number>();
    for (const p of providers) {
      const key = `${p.specialty}|${p.state}`;
      peerGroupSizes.set(key, (peerGroupSizes.get(key) || 0) + 1);
    }
    
    let adequateGroups = 0;
    let lowSampleGroups = 0;
    let veryLowSampleGroups = 0;
    
    for (const size of peerGroupSizes.values()) {
      if (size >= 20) adequateGroups++;
      else if (size >= 10) lowSampleGroups++;
      else veryLowSampleGroups++;
    }

    // Update compute run to success
    if (computeRun) {
      await supabaseAdmin
        .from('compute_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          parameters_json: {
            seed: SEED,
            provider_count: PROVIDER_COUNT,
            years: [2023, 2024],
            predetermined_outliers: outlierIndices.size,
            peer_groups_adequate: adequateGroups,
            peer_groups_low_sample: lowSampleGroups,
            peer_groups_very_low_sample: veryLowSampleGroups
          }
        })
        .eq('id', computeRun.id);
    }

    // Log the seed action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'seed_synthetic_data',
      entity_type: 'dataset_releases',
      entity_id: datasetRelease.id,
      metadata: {
        provider_count: PROVIDER_COUNT,
        seed: SEED,
        predetermined_outliers: outlierIndices.size,
        peer_groups_total: peerGroupSizes.size,
        peer_groups_adequate: adequateGroups,
        peer_groups_low_sample: lowSampleGroups,
        peer_groups_very_low_sample: veryLowSampleGroups,
        compute_run_id: computeRun?.id
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        dataset_release_id: datasetRelease.id,
        dataset_release_label: releaseLabel,
        compute_run_id: computeRun?.id,
        providers_created: insertedProviders.length,
        metrics_created: metrics.length,
        provider_attributes_created: providerAttributes.length,
        predetermined_outliers: outlierIndices.size,
        peer_groups: {
          total: peerGroupSizes.size,
          adequate: adequateGroups,
          low_sample: lowSampleGroups,
          very_low_sample: veryLowSampleGroups
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seed-synthetic-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
