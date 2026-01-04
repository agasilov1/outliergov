import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Users, TrendingUp, Loader2, Info } from 'lucide-react';
import { DataLineagePanel } from '@/components/DataLineagePanel';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { ProviderFilters, ConfidenceLevel } from '@/components/ProviderFilters';
import { ConfidenceBadge, getConfidenceLevel } from '@/components/ConfidenceBadge';

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

interface RankedProvider extends AnomalyFlagV2 {
  maxPercentile: number;
  minPeerSize: number;
  yearsAboveThreshold: number;
  confidence: ConfidenceLevel;
  rank: number;
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
  
  // Filter state
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel[]>([]);
  const [minPeerSizeFilter, setMinPeerSizeFilter] = useState(0);

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

  // Fetch ALL providers with anomaly data
  const { data: allProviders, isLoading: providersLoading } = useQuery({
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
        `);
      
      if (error) throw error;
      return data as AnomalyFlagV2[];
    }
  });

  // Fetch total providers count
  const { data: totalProvidersInDb } = useQuery({
    queryKey: ['total-providers'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Compute ranked providers with MAX percentile (worst-case anomalousness)
  const rankedProviders = useMemo(() => {
    if (!allProviders) return [];
    
    const withRankingData = allProviders.map(provider => {
      const years = provider.anomaly_flag_years || [];
      
      // MAX percentile = worst-case anomalousness (higher = more anomalous)
      const maxPercentile = years.length > 0 
        ? Math.max(...years.map(y => y.percentile_rank)) 
        : 0;
      
      // MIN peer size for confidence calculation
      const minPeerSize = years.length > 0 
        ? Math.min(...years.map(y => y.peer_size)) 
        : 0;
      
      // Years count for display only
      const yearsAboveThreshold = years.length;
      
      // Compute confidence level (UI only, based on peer size)
      const confidence = getConfidenceLevel(minPeerSize);
      
      return {
        ...provider,
        maxPercentile,
        minPeerSize,
        yearsAboveThreshold,
        confidence,
        rank: 0 // Will be set after sorting
      };
    });
    
    // Sort: MAX percentile DESC (primary), years DESC (secondary), peer size DESC (tertiary)
    const sorted = withRankingData.sort((a, b) => {
      if (b.maxPercentile !== a.maxPercentile) 
        return b.maxPercentile - a.maxPercentile;
      if (b.yearsAboveThreshold !== a.yearsAboveThreshold) 
        return b.yearsAboveThreshold - a.yearsAboveThreshold;
      return b.minPeerSize - a.minPeerSize;
    });
    
    // Assign ranks
    sorted.forEach((p, index) => {
      p.rank = index + 1;
    });
    
    return sorted as RankedProvider[];
  }, [allProviders]);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    if (!rankedProviders) return { states: [], specialties: [] };
    
    const states = [...new Set(rankedProviders.map(p => p.normalized_state))].sort();
    const specialties = [...new Set(rankedProviders.map(p => p.normalized_specialty))].sort();
    
    return { states, specialties };
  }, [rankedProviders]);

  // Apply filters
  const filteredProviders = useMemo(() => {
    return rankedProviders.filter(p => {
      if (stateFilter.length > 0 && !stateFilter.includes(p.normalized_state)) return false;
      if (specialtyFilter.length > 0 && !specialtyFilter.includes(p.normalized_specialty)) return false;
      if (confidenceFilter.length > 0 && !confidenceFilter.includes(p.confidence)) return false;
      if (p.minPeerSize < minPeerSizeFilter) return false;
      return true;
    });
  }, [rankedProviders, stateFilter, specialtyFilter, confidenceFilter, minPeerSizeFilter]);

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

  // Stats calculations
  const highConfidenceCount = rankedProviders.filter(p => p.confidence === 'high').length;

  const formatPercentile = (value: number) => {
    return `${Number(value).toFixed(1)}th`;
  };

  const handleRowClick = (providerId: string, rank: number, totalCount: number) => {
    navigate(`/provider/${providerId}?rank=${rank}&total=${totalCount}`);
  };

  const getPercentileForYear = (flag: RankedProvider, year: number) => {
    const yearData = flag.anomaly_flag_years?.find(y => y.year === year);
    return yearData?.percentile_rank;
  };

  const getProviderDisplayName = (provider: AnomalyFlagV2['providers']) => {
    if (!provider) return 'Unknown';
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  const handleClearAllFilters = () => {
    setStateFilter([]);
    setSpecialtyFilter([]);
    setConfidenceFilter([]);
    setMinPeerSizeFilter(0);
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <DisclaimerBanner variant="detailed" />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistical Outlier Rankings</h1>
        <p className="text-muted-foreground">
          Providers ranked by statistical variance from peers. Click a row to view details.
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
            <CardTitle className="text-sm font-medium">Total Ranked Providers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : rankedProviders.length.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Statistical outliers identified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">High</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : highConfidenceCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Peer group size ≥ 20
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers in DB</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProvidersInDb?.toLocaleString() || '--'}</div>
            <p className="text-xs text-muted-foreground">
              Full dataset
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
              Years analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ranked Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Provider Rankings
          </CardTitle>
          <CardDescription>
            All statistical outliers ranked by maximum percentile (descending). 
            Confidence labels reflect peer group size for statistical significance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <ProviderFilters
            states={filterOptions.states}
            specialties={filterOptions.specialties}
            selectedStates={stateFilter}
            selectedSpecialties={specialtyFilter}
            selectedConfidence={confidenceFilter}
            minPeerSize={minPeerSizeFilter}
            onStateChange={setStateFilter}
            onSpecialtyChange={setSpecialtyFilter}
            onConfidenceChange={setConfidenceFilter}
            onMinPeerSizeChange={setMinPeerSizeFilter}
            onClearAll={handleClearAllFilters}
            totalCount={rankedProviders.length}
            filteredCount={filteredProviders.length}
          />

          {/* Table */}
          {providersLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              {rankedProviders.length === 0 
                ? 'No statistical outliers found. Run anomaly computation from the Admin panel.'
                : 'No providers match the current filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Provider Name</TableHead>
                    <TableHead>NPI</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>State</TableHead>
                    {uniqueYears.map(year => (
                      <TableHead key={year} className="text-right">{year}</TableHead>
                    ))}
                    <TableHead className="text-right">Max %ile</TableHead>
                    <TableHead className="text-right">Min Peers</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => {
                    const isLowPeer = provider.minPeerSize < 20;

                    return (
                      <TableRow
                        key={provider.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(provider.provider_id, provider.rank, rankedProviders.length)}
                      >
                        <TableCell className="font-mono font-semibold text-muted-foreground">
                          #{provider.rank}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getProviderDisplayName(provider.providers)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {provider.providers?.npi || '-'}
                        </TableCell>
                        <TableCell>{provider.normalized_specialty}</TableCell>
                        <TableCell>{provider.normalized_state}</TableCell>
                        {uniqueYears.map(year => {
                          const percentile = getPercentileForYear(provider, year);
                          return (
                            <TableCell key={year} className="text-right">
                              {percentile !== undefined ? (
                                <Badge variant="secondary" className="font-mono">
                                  {formatPercentile(percentile)}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="font-mono">
                            {formatPercentile(provider.maxPercentile)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isLowPeer && (
                              <Info className="h-3 w-3 text-amber-500" />
                            )}
                            <span className={isLowPeer ? 'text-amber-500' : ''}>
                              {provider.minPeerSize}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ConfidenceBadge confidence={provider.confidence} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
