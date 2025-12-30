import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, AlertTriangle, FileText, Printer, Info, TrendingUp } from 'lucide-react';
import { PeerDistributionChart } from '@/components/PeerDistributionChart';
import { YearlyComparisonChart } from '@/components/YearlyComparisonChart';
import { ProviderBrief } from '@/components/ProviderBrief';
import { useState, useEffect } from 'react';

interface Provider {
  id: string;
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
}

interface AnomalyFlag {
  id: string;
  provider_id: string;
  specialty: string;
  state: string;
  percentile_2023: number;
  percentile_2024: number;
  threshold_2023: number;
  threshold_2024: number;
  peer_group_size: number;
  rule_version: string;
  computed_at: string;
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

  // Fetch anomaly flag for this provider
  const { data: anomalyFlag } = useQuery({
    queryKey: ['anomaly-flag', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_flags')
        .select('*')
        .eq('provider_id', id)
        .maybeSingle();
      if (error) throw error;
      return data as AnomalyFlag | null;
    },
    enabled: !!id
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

  // Fetch peer group distribution for histogram
  const { data: peerDistribution } = useQuery({
    queryKey: ['peer-distribution', provider?.specialty, provider?.state],
    queryFn: async () => {
      if (!provider) return null;
      
      // Get all providers in the same peer group
      const { data: peers, error: peersError } = await supabase
        .from('providers')
        .select('id')
        .eq('specialty', provider.specialty)
        .eq('state', provider.state);
      
      if (peersError) throw peersError;
      
      const peerIds = peers.map(p => p.id);
      
      // Get all their metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('provider_yearly_metrics')
        .select('provider_id, year, total_allowed_amount')
        .in('provider_id', peerIds);
      
      if (metricsError) throw metricsError;
      
      return metrics;
    },
    enabled: !!provider
  });

  // Calculate peer stats
  const peerStats: PeerStats[] = peerDistribution 
    ? [2023, 2024].map(year => {
        const yearMetrics = peerDistribution
          .filter(m => m.year === year)
          .map(m => Number(m.total_allowed_amount))
          .sort((a, b) => a - b);
        
        if (yearMetrics.length === 0) {
          return { year, median: 0, p95: 0, p99: 0, p995: 0, mean: 0 };
        }
        
        const n = yearMetrics.length;
        const sum = yearMetrics.reduce((a, b) => a + b, 0);
        
        return {
          year,
          median: yearMetrics[Math.floor(n * 0.5)],
          p95: yearMetrics[Math.floor(n * 0.95)],
          p99: yearMetrics[Math.floor(n * 0.99)],
          p995: yearMetrics[Math.floor(n * 0.995)],
          mean: sum / n
        };
      })
    : [];

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

  const providerAmount2023 = providerMetrics?.find(m => m.year === 2023)?.total_allowed_amount || 0;
  const providerAmount2024 = providerMetrics?.find(m => m.year === 2024)?.total_allowed_amount || 0;

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
              <CardTitle className="text-2xl">{provider.provider_name}</CardTitle>
              <CardDescription className="mt-1">
                NPI: {provider.npi} • {provider.specialty} • {provider.state}
              </CardDescription>
            </div>
            {anomalyFlag && (
              <Badge variant="destructive" className="flex items-center gap-1 px-3 py-1">
                <AlertTriangle className="h-4 w-4" />
                Flagged
              </Badge>
            )}
          </div>
        </CardHeader>
        {anomalyFlag && (
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">2023 Percentile Rank: </span>
                <span className="font-semibold">{formatPercentile(anomalyFlag.percentile_2023)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">2024 Percentile Rank: </span>
                <span className="font-semibold">{formatPercentile(anomalyFlag.percentile_2024)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Peer Group Size: </span>
                <span className="font-semibold">{anomalyFlag.peer_group_size} providers</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Small Peer Group Warning */}
      {anomalyFlag && anomalyFlag.peer_group_size < 20 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Info className="h-5 w-5 text-warning" />
            <p className="text-sm">
              This peer group contains only <strong>{anomalyFlag.peer_group_size}</strong> providers. 
              Statistical significance of percentile rankings is limited for small groups.
            </p>
          </CardContent>
        </Card>
      )}

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
            </CardDescription>
          </CardHeader>
          <CardContent>
            {peerDistribution && peerDistribution.length > 0 ? (
              <PeerDistributionChart
                peerData={peerDistribution.filter(m => m.year === 2024).map(m => Number(m.total_allowed_amount))}
                providerAmount={Number(providerAmount2024)}
                year={2024}
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
                <TableHead className="text-right">2023</TableHead>
                <TableHead className="text-right">2024</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Peer Group Size</TableCell>
                <TableCell className="text-right">{anomalyFlag?.peer_group_size || '-'}</TableCell>
                <TableCell className="text-right">{anomalyFlag?.peer_group_size || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Median</TableCell>
                <TableCell className="text-right">{peerStats[0] ? formatCurrency(peerStats[0].median) : '-'}</TableCell>
                <TableCell className="text-right">{peerStats[1] ? formatCurrency(peerStats[1].median) : '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mean</TableCell>
                <TableCell className="text-right">{peerStats[0] ? formatCurrency(peerStats[0].mean) : '-'}</TableCell>
                <TableCell className="text-right">{peerStats[1] ? formatCurrency(peerStats[1].mean) : '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">95th Percentile</TableCell>
                <TableCell className="text-right">{peerStats[0] ? formatCurrency(peerStats[0].p95) : '-'}</TableCell>
                <TableCell className="text-right">{peerStats[1] ? formatCurrency(peerStats[1].p95) : '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">99th Percentile</TableCell>
                <TableCell className="text-right">{peerStats[0] ? formatCurrency(peerStats[0].p99) : '-'}</TableCell>
                <TableCell className="text-right">{peerStats[1] ? formatCurrency(peerStats[1].p99) : '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">99.5th Percentile (Threshold)</TableCell>
                <TableCell className="text-right">{anomalyFlag ? formatCurrency(Number(anomalyFlag.threshold_2023)) : '-'}</TableCell>
                <TableCell className="text-right">{anomalyFlag ? formatCurrency(Number(anomalyFlag.threshold_2024)) : '-'}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>This Provider</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(providerAmount2023))}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(providerAmount2024))}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>This Provider's Percentile Rank</TableCell>
                <TableCell className="text-right">{anomalyFlag ? formatPercentile(anomalyFlag.percentile_2023) : '-'}</TableCell>
                <TableCell className="text-right">{anomalyFlag ? formatPercentile(anomalyFlag.percentile_2024) : '-'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Brief Modal */}
      {showBrief && provider && anomalyFlag && (
        <ProviderBrief
          provider={provider}
          anomalyFlag={anomalyFlag}
          metrics={providerMetrics || []}
          peerStats={peerStats}
          onClose={() => setShowBrief(false)}
        />
      )}
    </div>
  );
}
