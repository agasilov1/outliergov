import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarChart3, AlertTriangle, Users, TrendingUp, Loader2, Info, Search } from 'lucide-react';
import { DataLineagePanel } from '@/components/DataLineagePanel';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';

interface AnomalyFlagV2 {
  id: string;
  provider_id: string;
  normalized_specialty: string;
  normalized_state: string;
  flagged: boolean;
  flag_reason: string | null;
  metric_name: string;
  rule_set_version: string;
  providers: {
    id: string;
    npi: string;
    provider_name: string;
  };
  anomaly_flag_years: {
    year: number;
    percentile_rank: number;
    peer_size: number;
    value: number;
    p995_threshold: number;
  }[];
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

export default function Dashboard() {
  const { user, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  // Default: ON for admins, OFF for non-admins
  const [showLowConfidence, setShowLowConfidence] = useState(false);

  // Fetch active dataset release
  const { data: datasetRelease, isLoading: releaseLoading } = useQuery({
    queryKey: ['active-dataset-release'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dataset_releases')
        .select('*')
        .eq('status', 'active')
        .order('ingested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as DatasetRelease | null;
    }
  });

  // Fetch latest compute run
  const { data: computeRun } = useQuery({
    queryKey: ['latest-compute-run', datasetRelease?.id],
    queryFn: async () => {
      if (!datasetRelease) return null;
      const { data, error } = await supabase
        .from('compute_runs')
        .select('*')
        .eq('dataset_release_id', datasetRelease.id)
        .eq('run_type', 'anomaly_flags_v2')
        .eq('status', 'success')
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as ComputeRun | null;
    },
    enabled: !!datasetRelease
  });

  // Fetch ALL providers with anomaly data (both flagged and suppressed)
  const { data: allProviders, isLoading: flaggedLoading } = useQuery({
    queryKey: ['all-anomaly-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_flags_v2')
        .select(`
          id,
          provider_id,
          normalized_specialty,
          normalized_state,
          flagged,
          flag_reason,
          metric_name,
          rule_set_version,
          providers (
            id,
            npi,
            provider_name
          ),
          anomaly_flag_years (
            year,
            percentile_rank,
            peer_size,
            value,
            p995_threshold
          )
        `)
        .order('flagged', { ascending: false });
      
      if (error) throw error;
      return data as AnomalyFlagV2[];
    }
  });

  // Separate high confidence and low confidence providers
  const highConfidenceProviders = useMemo(() => 
    allProviders?.filter(f => f.flagged) || [], 
    [allProviders]
  );
  
  const lowConfidenceProviders = useMemo(() => 
    allProviders?.filter(f => !f.flagged) || [], 
    [allProviders]
  );

  // Fetch total providers count
  const { data: totalProviders } = useQuery({
    queryKey: ['total-providers'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch distinct peer groups count
  const { data: peerGroupCount } = useQuery({
    queryKey: ['peer-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('specialty, state');
      
      if (error) throw error;
      
      const uniqueGroups = new Set(data?.map(p => `${p.specialty}|${p.state}`));
      return uniqueGroups.size;
    }
  });

  // Derive unique years from all providers data
  const uniqueYears = useMemo(() => {
    if (!allProviders || allProviders.length === 0) return [];
    const years = new Set<number>();
    allProviders.forEach(fp => {
      fp.anomaly_flag_years?.forEach(fy => years.add(fy.year));
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [allProviders]);

  // Format year range for display
  const yearRangeDisplay = useMemo(() => {
    if (uniqueYears.length === 0) return '--';
    if (uniqueYears.length === 1) return uniqueYears[0].toString();
    return `${uniqueYears[0]}-${uniqueYears[uniqueYears.length - 1]}`;
  }, [uniqueYears]);

  const formatPercentile = (value: number) => {
    return `${Number(value).toFixed(1)}th`;
  };

  const handleRowClick = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  const getMinPeerSize = (flag: AnomalyFlagV2) => {
    if (!flag.anomaly_flag_years || flag.anomaly_flag_years.length === 0) return null;
    return Math.min(...flag.anomaly_flag_years.map(y => y.peer_size));
  };

  const getPercentileForYear = (flag: AnomalyFlagV2, year: number) => {
    const yearData = flag.anomaly_flag_years?.find(y => y.year === year);
    return yearData?.percentile_rank;
  };

  const getProviderDisplayName = (provider: AnomalyFlagV2['providers']) => {
    if (!provider) return 'Unknown';
    // If provider_name equals NPI, show formatted NPI instead
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  const renderProviderTable = (providers: AnomalyFlagV2[], isHighConfidence: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider Name</TableHead>
          <TableHead>NPI</TableHead>
          <TableHead>Specialty</TableHead>
          <TableHead>State</TableHead>
          {uniqueYears.map(year => (
            <TableHead key={year} className="text-right">{year} Percentile</TableHead>
          ))}
          <TableHead className="text-right">Min Peer Size</TableHead>
          <TableHead>Classification</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {providers.map((flag) => {
          const minPeerSize = getMinPeerSize(flag);
          const isLowSample = minPeerSize !== null && minPeerSize < 20;

          return (
            <TableRow
              key={flag.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(flag.provider_id)}
            >
              <TableCell className="font-medium">
                {getProviderDisplayName(flag.providers)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {flag.providers?.npi || '-'}
              </TableCell>
              <TableCell>{flag.normalized_specialty}</TableCell>
              <TableCell>{flag.normalized_state}</TableCell>
              {uniqueYears.map(year => {
                const percentile = getPercentileForYear(flag, year);
                return (
                  <TableCell key={year} className="text-right">
                    {percentile !== undefined ? (
                      <Badge 
                        variant={isHighConfidence ? 'destructive' : 'secondary'} 
                        className="font-mono"
                      >
                        {formatPercentile(percentile)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                );
              })}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {isLowSample && (
                    <Info className="h-3 w-3 text-amber-500" />
                  )}
                  <span className={isLowSample ? 'text-amber-500' : ''}>
                    {minPeerSize || '-'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {isHighConfidence ? (
                  <Badge variant="destructive">High Confidence</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    Low Confidence
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <DisclaimerBanner variant="detailed" />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Statistical anomaly analysis of healthcare spending data
        </p>
      </div>

      {/* Data Lineage Panel */}
      <DataLineagePanel 
        datasetRelease={datasetRelease || null} 
        computeRun={computeRun || null}
        isLoading={releaseLoading}
      />

      {/* User info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Welcome back
            {isAdmin && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                Admin
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Roles:</span>
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">No roles assigned</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flaggedLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : highConfidenceProviders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              ≥99.0th percentile, {uniqueYears.length || '--'} consecutive years
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Possible Outliers</CardTitle>
            <Search className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {flaggedLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : lowConfidenceProviders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Low confidence / exploratory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProviders?.toLocaleString() || '--'}</div>
            <p className="text-xs text-muted-foreground">
              In database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Period</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearRangeDisplay}</div>
            <p className="text-xs text-muted-foreground">
              Consecutive years analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* HIGH CONFIDENCE Flagged Providers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Flagged Providers (High Confidence)
              </CardTitle>
              <CardDescription>
                Providers with total allowed amount at or above the 99.0th percentile for {uniqueYears.length || '--'} consecutive years, 
                with peer group size ≥20. Click a row to view details.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flaggedLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : highConfidenceProviders.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              No high-confidence flags found. Run anomaly computation from the Admin panel.
            </div>
          ) : (
            renderProviderTable(highConfidenceProviders, true)
          )}
        </CardContent>
      </Card>

      {/* LOW CONFIDENCE / Exploratory Section - Admin only toggle */}
      {isAdmin && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <Search className="h-5 w-5" />
                  Possible Outliers (Low Confidence)
                </CardTitle>
                <CardDescription>
                  Providers meeting statistical criteria but with limited peer group sizes. 
                  These are investigative leads, not conclusions.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-low-confidence"
                  checked={showLowConfidence}
                  onCheckedChange={setShowLowConfidence}
                />
                <Label htmlFor="show-low-confidence" className="text-sm">
                  Show exploratory results
                </Label>
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
                  {lowConfidenceProviders.length} providers
                </Badge>
              </div>
            </div>
          </CardHeader>
          {showLowConfidence && (
            <CardContent>
              {/* Disclaimer for low confidence section */}
              <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    <strong>Low Confidence Notice:</strong> These results are based on small peer group sizes (&lt;20 providers), 
                    which limits statistical significance. Use these as investigative leads only—additional review is required 
                    before drawing any conclusions.
                  </p>
                </div>
              </div>
              
              {lowConfidenceProviders.length === 0 ? (
                <div className="flex min-h-[100px] items-center justify-center text-muted-foreground">
                  No low-confidence outliers found.
                </div>
              ) : (
                renderProviderTable(lowConfidenceProviders, false)
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
