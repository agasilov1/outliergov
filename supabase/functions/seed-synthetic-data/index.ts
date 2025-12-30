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

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// State weights (higher population states get more providers)
const STATE_WEIGHTS: Record<string, number> = {
  'CA': 12, 'TX': 10, 'FL': 9, 'NY': 9, 'PA': 6,
  'IL': 5, 'OH': 5, 'GA': 4, 'NC': 4, 'MI': 4,
  'NJ': 4, 'VA': 3, 'WA': 3, 'AZ': 3, 'MA': 3,
  'TN': 3, 'IN': 2, 'MO': 2, 'MD': 2, 'WI': 2,
  'CO': 2, 'MN': 2, 'SC': 2, 'AL': 2, 'LA': 2,
  'KY': 2, 'OR': 2, 'OK': 1, 'CT': 1, 'UT': 1,
  'IA': 1, 'NV': 1, 'AR': 1, 'MS': 1, 'KS': 1,
  'NM': 1, 'NE': 1, 'ID': 1, 'WV': 1, 'HI': 1,
  'NH': 1, 'ME': 1, 'MT': 1, 'RI': 1, 'DE': 1,
  'SD': 1, 'ND': 1, 'AK': 1, 'VT': 1, 'WY': 1
};

// First and last name parts for realistic provider names
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
  // NPIs start with 1 or 2, followed by 9 digits
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

    console.log('Starting synthetic data seeding...');

    // Clear existing data
    await supabaseAdmin.from('anomaly_flags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_yearly_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('providers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Cleared existing data');

    // Fixed seed for deterministic generation
    const SEED = 12345;
    const rand = mulberry32(SEED);

    const PROVIDER_COUNT = 5000;
    const providers: any[] = [];
    const metrics: any[] = [];

    // Track which providers will be outliers (for consistent 2-year behavior)
    const outlierIndices = new Set<number>();
    
    // Pre-determine ~0.7% as persistent outliers across both years
    // This should yield ~25-35 flagged after percentile calculation
    for (let i = 0; i < PROVIDER_COUNT; i++) {
      if (rand() < 0.007) {
        outlierIndices.add(i);
      }
    }

    console.log(`Pre-determined ${outlierIndices.size} persistent outliers`);

    // Generate providers
    for (let i = 0; i < PROVIDER_COUNT; i++) {
      const specialty = SPECIALTIES[Math.floor(rand() * SPECIALTIES.length)];
      const state = selectWeighted(rand, STATES, STATE_WEIGHTS);
      const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      
      providers.push({
        npi: generateNPI(rand, i + 1),
        provider_name: `${firstName} ${lastName}, MD`,
        specialty,
        state
      });
    }

    console.log(`Generated ${providers.length} providers`);

    // Insert providers in batches
    const BATCH_SIZE = 500;
    const insertedProviders: any[] = [];
    
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

    // Generate metrics for each provider
    // Log-normal parameters: median ~$150k, heavy right tail
    // ln(150000) ≈ 11.92, use stddev of ~1.2 for heavy tail
    const LOG_MEAN = 11.92;
    const LOG_STD_DEV = 1.2;

    for (let i = 0; i < insertedProviders.length; i++) {
      const providerId = insertedProviders[i].id;
      const isOutlier = outlierIndices.has(i);

      for (const year of [2023, 2024]) {
        let amount: number;
        
        if (isOutlier) {
          // Outliers: consistently high across both years
          // Use higher log-mean for outliers (99th+ percentile range)
          amount = logNormalRandom(rand, LOG_MEAN + 2.5, 0.5);
          // Add some year-to-year variation (±15%)
          const yearVariation = 0.85 + rand() * 0.3;
          amount *= yearVariation;
        } else {
          // Normal distribution for non-outliers
          amount = logNormalRandom(rand, LOG_MEAN, LOG_STD_DEV);
        }

        // Ensure minimum of $10,000 and cap at $15M
        amount = Math.max(10000, Math.min(15000000, amount));
        
        metrics.push({
          provider_id: providerId,
          year,
          total_allowed_amount: Math.round(amount * 100) / 100,
          total_payment_amount: Math.round(amount * 100) / 100
        });
      }
    }

    console.log(`Generated ${metrics.length} yearly metrics`);

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

    // Log the seed action
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'seed_synthetic_data',
      entity_type: 'providers',
      metadata: {
        provider_count: PROVIDER_COUNT,
        seed: SEED,
        predetermined_outliers: outlierIndices.size
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        providers_created: insertedProviders.length,
        metrics_created: metrics.length,
        predetermined_outliers: outlierIndices.size
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
