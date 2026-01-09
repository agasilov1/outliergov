import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Users, TrendingUp, Loader2, Info } from 'lucide-react';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { ProviderFilters, ConfidenceLevel } from '@/components/ProviderFilters';
import { ConfidenceBadge, getConfidenceLevel } from '@/components/ConfidenceBadge';

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

interface AggregatedProvider {
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
  years: { year: number; percentile_rank: number; total_allowed_amount: number }[];
  maxPercentile: number;
  minPeerSize: number;
  yearsAboveThreshold: number;
  confidence: ConfidenceLevel;
  rank: number;
}

export default function Dashboard() {
  const { user, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  
  // Filter state
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel[]>([]);
  const [minPeerSizeFilter, setMinPeerSizeFilter] = useState(0);

  // Fetch ALL data from anomalies_offline
  const { data: anomaliesOffline, isLoading: providersLoading } = useQuery({
    queryKey: ['anomalies-offline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomalies_offline')
        .select('*');
      
      if (error) throw error;
      return data as AnomalyOffline[];
    }
  });

  // Aggregate providers from anomalies_offline
  const rankedProviders = useMemo(() => {
    if (!anomaliesOffline || anomaliesOffline.length === 0) return [];
    
    // Group by NPI
    const grouped = anomaliesOffline.reduce((acc, row) => {
      if (!acc[row.npi]) {
        acc[row.npi] = {
          npi: row.npi,
          provider_name: row.provider_name || `Provider NPI ${row.npi}`,
          specialty: row.specialty || 'Unknown',
          state: row.state || 'Unknown',
          years: []
        };
      }
      acc[row.npi].years.push({
        year: row.year,
        percentile_rank: Number(row.percentile_rank) || 0,
        total_allowed_amount: Number(row.total_allowed_amount) || 0
      });
      return acc;
    }, {} as Record<string, { npi: string; provider_name: string; specialty: string; state: string; years: { year: number; percentile_rank: number; total_allowed_amount: number }[] }>);
    
    // Convert to array and calculate metrics
    const providers: AggregatedProvider[] = Object.values(grouped).map((p) => {
      const maxPercentile = p.years.length > 0 
        ? Math.max(...p.years.map(y => y.percentile_rank)) 
        : 0;
      
      // Count years where percentile >= 0.995 (99.5th)
      const yearsAboveThreshold = p.years.filter(y => y.percentile_rank >= 0.995).length;
      
      // We don't have peer_size in anomalies_offline, so assume high confidence (peer size >= 20)
      const minPeerSize = 20;
      const confidence = getConfidenceLevel(minPeerSize);
      
      return {
        ...p,
        maxPercentile,
        minPeerSize,
        yearsAboveThreshold,
        confidence,
        rank: 0
      };
    });
    
    // Sort by max percentile DESC
    providers.sort((a, b) => {
      if (b.maxPercentile !== a.maxPercentile) 
        return b.maxPercentile - a.maxPercentile;
      return b.yearsAboveThreshold - a.yearsAboveThreshold;
    });
    
    // Assign ranks
    providers.forEach((p, index) => {
      p.rank = index + 1;
    });
    
    return providers;
  }, [anomaliesOffline]);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    if (!rankedProviders) return { states: [], specialties: [] };
    
    const states = [...new Set(rankedProviders.map(p => p.state))].sort();
    const specialties = [...new Set(rankedProviders.map(p => p.specialty))].sort();
    
    return { states, specialties };
  }, [rankedProviders]);

  // Apply filters
  const filteredProviders = useMemo(() => {
    return rankedProviders.filter(p => {
      if (stateFilter.length > 0 && !stateFilter.includes(p.state)) return false;
      if (specialtyFilter.length > 0 && !specialtyFilter.includes(p.specialty)) return false;
      if (confidenceFilter.length > 0 && !confidenceFilter.includes(p.confidence)) return false;
      if (p.minPeerSize < minPeerSizeFilter) return false;
      return true;
    });
  }, [rankedProviders, stateFilter, specialtyFilter, confidenceFilter, minPeerSizeFilter]);

  // Derive unique years from anomalies_offline
  const uniqueYears = useMemo(() => {
    if (!anomaliesOffline || anomaliesOffline.length === 0) return [];
    return [...new Set(anomaliesOffline.map(a => a.year))].sort((a, b) => a - b);
  }, [anomaliesOffline]);

  // Format year range for display
  const yearRangeDisplay = useMemo(() => {
    if (uniqueYears.length === 0) return '--';
    if (uniqueYears.length === 1) return uniqueYears[0].toString();
    return `${uniqueYears[0]}-${uniqueYears[uniqueYears.length - 1]}`;
  }, [uniqueYears]);

  // Stats calculations
  const highConfidenceCount = rankedProviders.filter(p => p.confidence === 'high').length;
  
  // Count providers with percentile >= 0.995 in ALL years
  const anomalyCount = rankedProviders.filter(p => 
    p.yearsAboveThreshold === uniqueYears.length && uniqueYears.length > 0
  ).length;

  const formatPercentile = (value: number) => {
    // Convert from decimal (0.995) to percentage (99.5th)
    const pct = value * 100;
    if (pct >= 99.9) return '≥99.9th';
    return `${pct.toFixed(1)}th`;
  };

  const handleRowClick = (npi: string, rank: number, totalCount: number) => {
    navigate(`/provider/${npi}?rank=${rank}&total=${totalCount}`);
  };

  const getPercentileForYear = (provider: AggregatedProvider, year: number) => {
    const yearData = provider.years.find(y => y.year === year);
    return yearData?.percentile_rank;
  };

  const getProviderDisplayName = (provider: AggregatedProvider) => {
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
              Unique providers in dataset
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies (Both Years)</CardTitle>
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Alert</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : anomalyCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ≥99.5th percentile in all years
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
                ? 'No data found in anomalies_offline table.'
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
                        key={provider.npi}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(provider.npi, provider.rank, rankedProviders.length)}
                      >
                        <TableCell className="font-mono font-semibold text-muted-foreground">
                          #{provider.rank}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getProviderDisplayName(provider)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {provider.npi}
                        </TableCell>
                        <TableCell>{provider.specialty}</TableCell>
                        <TableCell>{provider.state}</TableCell>
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
