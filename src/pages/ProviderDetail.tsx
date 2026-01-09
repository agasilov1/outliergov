import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Info, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PeerDistributionChart } from '@/components/PeerDistributionChart';
import { YearlyComparisonChart } from '@/components/YearlyComparisonChart';
import { PossibleExplanations } from '@/components/PossibleExplanations';
import { ConfidenceBadge, getConfidenceLevel, getConfidenceLabel } from '@/components/ConfidenceBadge';
import { useState, useEffect, useMemo } from 'react';

interface AnomalyOffline {
  id: string;
  npi: string;
  provider_name: string | null;
  specialty: string | null;
  state: string | null;
  year: number;
  percentile_rank: number | null;
  total_allowed_amount: number | null;
  beneficiary_count: number | null;
  service_count: number | null;
}

export default function ProviderDetail() {
  const { id: npi } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get rank from URL params
  const rankFromUrl = searchParams.get('rank');
  const totalFromUrl = searchParams.get('total');
  const rank = rankFromUrl ? parseInt(rankFromUrl) : null;
  const totalProviders = totalFromUrl ? parseInt(totalFromUrl) : null;

  // Log provider view for audit
  useEffect(() => {
    if (npi && user) {
      supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'provider_view',
        entity_type: 'provider',
        entity_id: npi
      }).then(({ error }) => {
        if (error) console.error('Audit log error:', error);
      });
    }
  }, [npi, user]);

  // Fetch anomaly data from anomalies_offline
  const { data: anomalyData, isLoading } = useQuery({
    queryKey: ['anomaly-offline', npi],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomalies_offline')
        .select('*')
        .eq('npi', npi)
        .order('year');
      if (error) throw error;
      return data as AnomalyOffline[];
    },
    enabled: !!npi
  });

  // Derive provider info from anomaly data
  const provider = useMemo(() => {
    if (!anomalyData || anomalyData.length === 0) return null;
    const first = anomalyData[0];
    return {
      npi: first.npi,
      provider_name: first.provider_name || `Provider NPI ${first.npi}`,
      specialty: first.specialty || 'Unknown',
      state: first.state || 'Unknown'
    };
  }, [anomalyData]);

  // Transform anomaly data to flag years format
  const flagYears = useMemo(() => {
    if (!anomalyData) return [];
    return anomalyData.map(row => ({
      year: row.year,
      percentile_rank: Number(row.percentile_rank) || 0,
      value: Number(row.total_allowed_amount) || 0,
      peer_size: 20, // Not available in anomalies_offline, assume 20
      p995_threshold: 0 // Not available
    }));
  }, [anomalyData]);

  // Calculate confidence
  const minPeerSize = 20; // Assumed since not available in anomalies_offline
  const confidence = getConfidenceLevel(minPeerSize);
  const confidenceLabel = getConfidenceLabel(confidence);

  // Fetch peer distribution for histogram
  const { data: peerDistribution } = useQuery({
    queryKey: ['peer-distribution-offline', provider?.specialty, provider?.state],
    queryFn: async () => {
      if (!provider) return null;
      
      const { data, error } = await supabase
        .from('anomalies_offline')
        .select('npi, year, total_allowed_amount')
        .eq('specialty', provider.specialty)
        .eq('state', provider.state);
      
      if (error) throw error;
      return data;
    },
    enabled: !!provider
  });

  // Derive unique years from peer distribution
  const peerDistributionYears = useMemo(() => {
    if (!peerDistribution) return [];
    return [...new Set(peerDistribution.map(m => m.year))].sort((a, b) => a - b);
  }, [peerDistribution]);

  // Calculate peer stats from distribution
  const peerStats = useMemo(() => {
    if (!peerDistribution || peerDistributionYears.length === 0) return [];
    
    return peerDistributionYears.map(year => {
      const yearMetrics = peerDistribution
        .filter(m => m.year === year)
        .map(m => Number(m.total_allowed_amount))
        .filter(v => !isNaN(v) && v > 0)
        .sort((a, b) => a - b);
      
      if (yearMetrics.length === 0) {
        return { year, median: 0, p95: 0, p99: 0, p995: 0, mean: 0, peer_size: 0 };
      }
      
      const n = yearMetrics.length;
      const sum = yearMetrics.reduce((a, b) => a + b, 0);
      
      return {
        year,
        median: yearMetrics[Math.floor(n * 0.5)] || 0,
        p95: yearMetrics[Math.floor(n * 0.95)] || 0,
        p99: yearMetrics[Math.floor(n * 0.99)] || 0,
        p995: yearMetrics[Math.floor(n * 0.995)] || 0,
        mean: sum / n,
        peer_size: n
      };
    });
  }, [peerDistribution, peerDistributionYears]);

  // Get provider amount for a given year
  const getProviderAmount = (year: number): number => {
    const row = anomalyData?.find(r => r.year === year);
    return Number(row?.total_allowed_amount) || 0;
  };

  // Get the latest year for the histogram
  const latestYear = useMemo(() => {
    if (!peerDistributionYears || peerDistributionYears.length === 0) return null;
    return Math.max(...peerDistributionYears);
  }, [peerDistributionYears]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentile = (value: number) => {
    // Convert from decimal (0.995) to percentage (99.5th)
    const pct = value * 100;
    return `${pct.toFixed(1)}th`;
  };

  const getProviderDisplayName = () => {
    if (!provider) return 'Unknown';
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading provider details...</div>
      </div>
    );
  }

  if (!provider || !anomalyData || anomalyData.length === 0) {
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
              {/* Rank indicator */}
              {rank && totalProviders && (
                <p className="text-sm text-muted-foreground mt-2">
                  Ranked #{rank} of {totalProviders.toLocaleString()} statistical outliers
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <ConfidenceBadge confidence={confidence} className="px-3 py-1" />
              <span className="text-xs text-muted-foreground">{confidenceLabel}</span>
            </div>
          </div>
        </CardHeader>
        {flagYears.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              {flagYears.map(fy => (
                <div key={fy.year}>
                  <span className="text-muted-foreground">{fy.year} Percentile Rank: </span>
                  <span className="font-semibold">{formatPercentile(fy.percentile_rank)}</span>
                </div>
              ))}
              <div>
                <span className="text-muted-foreground">Years Above Threshold: </span>
                <span className="font-semibold">{flagYears.filter(y => y.percentile_rank >= 0.995).length}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Classification Explanation Card */}
      <Card className={
        confidence === 'high' 
          ? "border-emerald-500/30 bg-emerald-500/5" 
          : confidence === 'medium'
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-gray-500/30 bg-gray-500/5"
      }>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ConfidenceBadge confidence={confidence} />
            <div>
              <h3 className={`font-semibold ${
                confidence === 'high' 
                  ? 'text-emerald-700' 
                  : confidence === 'medium'
                  ? 'text-amber-700'
                  : 'text-gray-700'
              }`}>
                {confidenceLabel}
              </h3>
              <p className="text-sm mt-1">
                This provider's total allowed amount ranked at or above the 99.5th percentile 
                within their peer group for {flagYears.filter(y => y.percentile_rank >= 0.995).length} year(s). 
                This is statistical variance only—not evidence of any wrongdoing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Year Breakdown Table */}
      {flagYears.length > 0 && (
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
                  <TableHead className="text-center">Met Threshold (≥99.5th)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagYears.map(fy => {
                  const meetsThreshold = fy.percentile_rank >= 0.995;
                  
                  return (
                    <TableRow key={fy.year}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(fy.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={meetsThreshold ? 'destructive' : 'secondary'} className="font-mono">
                          {formatPercentile(fy.percentile_rank)}
                        </Badge>
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
      <PossibleExplanations />

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
            {peerStats.length > 0 && anomalyData ? (
              <YearlyComparisonChart
                providerMetrics={anomalyData.map(m => ({ year: m.year, amount: Number(m.total_allowed_amount) || 0 }))}
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
              {flagYears.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>This Provider's Percentile Rank</TableCell>
                  {flagYears.map(fy => (
                    <TableCell key={fy.year} className="text-right">
                      {formatPercentile(fy.percentile_rank)}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
