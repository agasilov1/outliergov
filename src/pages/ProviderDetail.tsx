import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, AlertTriangle, FileText, Info, TrendingUp, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { PeerDistributionChart } from '@/components/PeerDistributionChart';
import { YearlyComparisonChart } from '@/components/YearlyComparisonChart';
import { ProviderBrief } from '@/components/ProviderBrief';
import { PossibleExplanations } from '@/components/PossibleExplanations';
import { DataLineagePanel } from '@/components/DataLineagePanel';
import { useState, useEffect, useMemo } from 'react';

interface Provider {
  id: string;
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
}

interface AnomalyFlagV2 {
  id: string;
  provider_id: string;
  normalized_specialty: string;
  normalized_state: string;
  flagged: boolean;
  flag_reason: string | null;
  metric_name: string;
  rule_set_version: string;
  peer_group_key: string;
  peer_group_version: string;
  threshold_percentile_required: number;
  min_peer_size_required: number;
  consecutive_years_required: number;
  computed_at: string;
  dataset_release_id: string;
  compute_run_id: string | null;
}

interface AnomalyFlagYear {
  id: string;
  anomaly_flag_id: string;
  year: number;
  percentile_rank: number;
  peer_size: number;
  value: number;
  p995_threshold: number;
}

interface Metric {
  year: number;
  total_allowed_amount: number;
}

interface PeerStats {
  year: number;
  median: number;
  p95: number;
  p99: number;
  p995: number;
  mean: number;
  peer_size: number;
}

interface DatasetRelease {
  id: string;
  release_label: string;
  dataset_key: string;
  status: string;
  ingested_at: string | null;
  source_url: string | null;
}

interface ComputeRun {
  id: string;
  rule_set_version: string;
  status: string;
  finished_at: string | null;
  parameters_json: Record<string, unknown>;
}

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showBrief, setShowBrief] = useState(false);

  // Log provider view for audit
  useEffect(() => {
    if (id && user) {
      supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'provider_view',
        entity_type: 'provider',
        entity_id: id
      }).then(({ error }) => {
        if (error) console.error('Audit log error:', error);
      });
    }
  }, [id, user]);

  // Fetch provider details
  const { data: provider, isLoading: providerLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Provider | null;
    },
    enabled: !!id
  });

  // Fetch anomaly flag v2 for this provider
  const { data: anomalyFlagV2 } = useQuery({
    queryKey: ['anomaly-flag-v2', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_flags_v2')
        .select('*')
        .eq('provider_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as AnomalyFlagV2 | null;
    },
    enabled: !!id
  });

  // Fetch anomaly flag years
  const { data: flagYears } = useQuery({
    queryKey: ['anomaly-flag-years', anomalyFlagV2?.id],
    queryFn: async () => {
      if (!anomalyFlagV2) return [];
      const { data, error } = await supabase
        .from('anomaly_flag_years')
        .select('*')
        .eq('anomaly_flag_id', anomalyFlagV2.id)
        .order('year');
      if (error) throw error;
      return data as AnomalyFlagYear[];
    },
    enabled: !!anomalyFlagV2?.id
  });

  // Fetch dataset release
  const { data: datasetRelease } = useQuery({
    queryKey: ['dataset-release', anomalyFlagV2?.dataset_release_id],
    queryFn: async () => {
      if (!anomalyFlagV2?.dataset_release_id) return null;
      const { data, error } = await supabase
        .from('dataset_releases')
        .select('*')
        .eq('id', anomalyFlagV2.dataset_release_id)
        .maybeSingle();
      if (error) throw error;
      return data as DatasetRelease | null;
    },
    enabled: !!anomalyFlagV2?.dataset_release_id
  });

  // Fetch compute run
  const { data: computeRun } = useQuery({
    queryKey: ['compute-run', anomalyFlagV2?.compute_run_id],
    queryFn: async () => {
      if (!anomalyFlagV2?.compute_run_id) return null;
      const { data, error } = await supabase
        .from('compute_runs')
        .select('*')
        .eq('id', anomalyFlagV2.compute_run_id)
        .maybeSingle();
      if (error) throw error;
      return data as ComputeRun | null;
    },
    enabled: !!anomalyFlagV2?.compute_run_id
  });

  // Fetch this provider's metrics
  const { data: providerMetrics } = useQuery({
    queryKey: ['provider-metrics', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_yearly_metrics')
        .select('year, total_allowed_amount')
        .eq('provider_id', id)
        .order('year');
      if (error) throw error;
      return data as Metric[];
    },
    enabled: !!id
  });

  // Fetch peer group stats from pre-computed table
  const { data: peerGroupStats } = useQuery({
    queryKey: ['peer-group-stats', provider?.specialty, provider?.state, datasetRelease?.id],
    queryFn: async () => {
      if (!provider || !datasetRelease) return [];
      const { data, error } = await supabase
        .from('peer_group_stats')
        .select('*')
        .eq('dataset_release_id', datasetRelease.id)
        .eq('normalized_specialty', provider.specialty)
        .eq('normalized_state', provider.state)
        .order('year');
      if (error) throw error;
      return data;
    },
    enabled: !!provider && !!datasetRelease
  });

  // Fetch peer group distribution for histogram
  const { data: peerDistribution } = useQuery({
    queryKey: ['peer-distribution', provider?.specialty, provider?.state],
    queryFn: async () => {
      if (!provider) return null;
      
      const { data: peers, error: peersError } = await supabase
        .from('providers')
        .select('id')
        .eq('specialty', provider.specialty)
        .eq('state', provider.state);
      
      if (peersError) throw peersError;
      
      const peerIds = peers.map(p => p.id);
      
      const { data: metrics, error: metricsError } = await supabase
        .from('provider_yearly_metrics')
        .select('provider_id, year, total_allowed_amount')
        .in('provider_id', peerIds);
      
      if (metricsError) throw metricsError;
      
      return metrics;
    },
    enabled: !!provider
  });

  // Derive unique years from peer distribution data for fallback calculation
  const peerDistributionYears = useMemo(() => {
    if (!peerDistribution) return [];
    return [...new Set(peerDistribution.map(m => m.year))].sort((a, b) => a - b);
  }, [peerDistribution]);

  // Calculate peer stats from pre-computed data or live data
  const peerStats: PeerStats[] = peerGroupStats && peerGroupStats.length > 0
    ? peerGroupStats.map(s => ({
        year: s.year,
        median: Number(s.p50) || 0,
        p95: Number(s.p95) || 0,
        p99: Number(s.p99) || 0,
        p995: Number(s.p995) || 0,
        mean: Number(s.mean) || 0,
        peer_size: s.peer_size
      }))
    : peerDistribution 
      ? peerDistributionYears.map(year => {
          const yearMetrics = peerDistribution
            .filter(m => m.year === year)
            .map(m => Number(m.total_allowed_amount))
            .sort((a, b) => a - b);
          
          if (yearMetrics.length === 0) {
            return { year, median: 0, p95: 0, p99: 0, p995: 0, mean: 0, peer_size: 0 };
          }
          
          const n = yearMetrics.length;
          const sum = yearMetrics.reduce((a, b) => a + b, 0);
          
          return {
            year,
            median: yearMetrics[Math.floor(n * 0.5)],
            p95: yearMetrics[Math.floor(n * 0.95)],
            p99: yearMetrics[Math.floor(n * 0.99)],
            p995: yearMetrics[Math.floor(n * 0.995)],
            mean: sum / n,
            peer_size: n
          };
        })
      : [];

  // Get provider amount for a given year
  const getProviderAmount = (year: number): number => {
    return Number(providerMetrics?.find(m => m.year === year)?.total_allowed_amount || 0);
  };

  // Get the latest year from peer distribution for the histogram
  const latestYear = useMemo(() => {
    if (!peerDistribution || peerDistribution.length === 0) return null;
    return Math.max(...peerDistribution.map(m => m.year));
  }, [peerDistribution]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentile = (value: number) => {
    return `${value.toFixed(1)}th`;
  };

  const hasLowSampleYear = flagYears?.some(y => y.peer_size < (anomalyFlagV2?.min_peer_size_required || 20));
  
  // Determine classification
  const isHighConfidence = anomalyFlagV2?.flagged === true;
  const isLowConfidence = anomalyFlagV2 && !anomalyFlagV2.flagged;

  const getProviderDisplayName = () => {
    if (!provider) return 'Unknown';
    // If provider_name equals NPI, show formatted NPI instead
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  if (providerLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading provider details...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">Provider not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button onClick={() => setShowBrief(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Export Brief
        </Button>
      </div>

      {/* Provider Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{getProviderDisplayName()}</CardTitle>
              <CardDescription className="mt-1">
                NPI: {provider.npi} • {provider.specialty} • {provider.state}
              </CardDescription>
            </div>
            {anomalyFlagV2 && (
              isHighConfidence ? (
                <Badge variant="destructive" className="flex items-center gap-1 px-3 py-1">
                  <AlertTriangle className="h-4 w-4" />
                  Flagged (High Confidence)
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-amber-600 border-amber-600">
                  <Search className="h-4 w-4" />
                  Possible Outlier (Low Confidence)
                </Badge>
              )
            )}
          </div>
        </CardHeader>
        {anomalyFlagV2 && flagYears && flagYears.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              {flagYears.map(fy => (
                <div key={fy.year}>
                  <span className="text-muted-foreground">{fy.year} Percentile Rank: </span>
                  <span className="font-semibold">{formatPercentile(Number(fy.percentile_rank))}</span>
                </div>
              ))}
              <div>
                <span className="text-muted-foreground">Peer Group Size: </span>
                <span className="font-semibold">
                  {flagYears[0]?.peer_size || '-'} providers
                </span>
              </div>
            </div>
            {!anomalyFlagV2.flagged && anomalyFlagV2.flag_reason && (
              <div className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium">Classification Reason: </span>
                {anomalyFlagV2.flag_reason}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Classification Explanation Card */}
      {anomalyFlagV2 && (
        <Card className={isHighConfidence ? "border-destructive/30 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {isHighConfidence ? (
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              ) : (
                <Search className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <h3 className={`font-semibold ${isHighConfidence ? 'text-destructive' : 'text-amber-700'}`}>
                  {isHighConfidence ? 'High Confidence Classification' : 'Low Confidence Classification'}
                </h3>
                <p className="text-sm mt-1">
                  {isHighConfidence ? (
                    <>
                      This provider's total allowed amount ranked at or above the {anomalyFlagV2.threshold_percentile_required}th percentile 
                      within their peer group for {anomalyFlagV2.consecutive_years_required} consecutive years, with a peer group size of at least {anomalyFlagV2.min_peer_size_required} providers. 
                      This meets the criteria for high-confidence statistical outlier classification.
                    </>
                  ) : (
                    <>
                      This provider meets statistical outlier criteria but is classified as low confidence due to limited peer group size (&lt;{anomalyFlagV2.min_peer_size_required} providers). 
                      This result should be treated as an investigative lead requiring additional verification—not a conclusion.
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Lineage */}
      <DataLineagePanel 
        datasetRelease={datasetRelease || null} 
        computeRun={computeRun || null} 
      />

      {/* Small Peer Group Warning */}
      {hasLowSampleYear && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Info className="h-5 w-5 text-amber-500" />
            <p className="text-sm">
              This peer group contains fewer than <strong>{anomalyFlagV2?.min_peer_size_required || 20}</strong> providers in one or more years. 
              Statistical significance of percentile rankings may be limited. Additional review is required.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Per-Year Breakdown Table */}
      {flagYears && flagYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Per-Year Statistical Breakdown
            </CardTitle>
            <CardDescription>
              Detailed metrics for each analysis year (statistical variance only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Provider Value</TableHead>
                  <TableHead className="text-right">Percentile Rank</TableHead>
                  <TableHead className="text-right">Peer Size</TableHead>
                  <TableHead className="text-right">99.0th Threshold</TableHead>
                  <TableHead className="text-center">Met Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagYears.map(fy => {
                  const meetsThreshold = Number(fy.percentile_rank) >= (anomalyFlagV2?.threshold_percentile_required || 99.0);
                  const isLowSample = fy.peer_size < (anomalyFlagV2?.min_peer_size_required || 20);
                  
                  return (
                    <TableRow key={fy.year}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(fy.value))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={meetsThreshold ? 'destructive' : 'secondary'} className="font-mono">
                          {formatPercentile(Number(fy.percentile_rank))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isLowSample && <Info className="h-3 w-3 text-amber-500" />}
                          <span className={isLowSample ? 'text-amber-500' : ''}>
                            {fy.peer_size}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(fy.p995_threshold))}
                      </TableCell>
                      <TableCell className="text-center">
                        {meetsThreshold ? (
                          <CheckCircle2 className="h-5 w-5 text-destructive mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Possible Explanations */}
      {anomalyFlagV2 && <PossibleExplanations />}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Peer Distribution Histogram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Peer Group Distribution
            </CardTitle>
            <CardDescription>
              Distribution of total allowed amounts for {provider.specialty} providers in {provider.state}
              {latestYear && ` (${latestYear})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {peerDistribution && peerDistribution.length > 0 && latestYear ? (
              <PeerDistributionChart
                peerData={peerDistribution.filter(m => m.year === latestYear).map(m => Number(m.total_allowed_amount))}
                providerAmount={getProviderAmount(latestYear)}
                year={latestYear}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No peer data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Year-over-Year Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Year-over-Year Comparison
            </CardTitle>
            <CardDescription>
              Provider's total allowed amount vs. peer group median
            </CardDescription>
          </CardHeader>
          <CardContent>
            {peerStats.length > 0 && providerMetrics ? (
              <YearlyComparisonChart
                providerMetrics={providerMetrics.map(m => ({ year: m.year, amount: Number(m.total_allowed_amount) }))}
                peerMedians={peerStats.map(s => ({ year: s.year, median: s.median }))}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No comparison data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peer Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Peer Group Statistics</CardTitle>
          <CardDescription>
            Statistical breakdown of the {provider.specialty} peer group in {provider.state}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statistic</TableHead>
                {peerStats.map(s => (
                  <TableHead key={s.year} className="text-right">{s.year}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Peer Group Size</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">{s.peer_size}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Median</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">{formatCurrency(s.median)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mean</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">{formatCurrency(s.mean)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">95th Percentile</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">{formatCurrency(s.p95)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">99th Percentile</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">{formatCurrency(s.p99)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">99.5th Percentile</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">{formatCurrency(s.p995)}</TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>This Provider</TableCell>
                {peerStats.map(s => (
                  <TableCell key={s.year} className="text-right">
                    {formatCurrency(getProviderAmount(s.year))}
                  </TableCell>
                ))}
              </TableRow>
              {flagYears && flagYears.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>This Provider's Percentile Rank</TableCell>
                  {flagYears.map(fy => (
                    <TableCell key={fy.year} className="text-right">
                      {formatPercentile(Number(fy.percentile_rank))}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Brief Modal */}
      {showBrief && provider && (
        <ProviderBrief
          provider={provider}
          anomalyFlagV2={anomalyFlagV2}
          flagYears={flagYears || []}
          metrics={providerMetrics || []}
          peerStats={peerStats}
          datasetRelease={datasetRelease}
          computeRun={computeRun}
          onClose={() => setShowBrief(false)}
        />
      )}
    </div>
  );
}
