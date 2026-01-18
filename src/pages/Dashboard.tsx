import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, Loader2 } from 'lucide-react';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { ProviderFilters } from '@/components/ProviderFilters';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface OutlierRegistry {
  npi: string;
  provider_name: string | null;
  specialty: string | null;
  state: string | null;
  years_as_outlier: number | null;
  max_x_vs_peer_median: number | null;
  max_total_allowed: number | null;
}

interface RankedProvider {
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
  yearsAsOutlier: number;
  maxPeerRatio: number | null;
  maxTotalAllowed: number;
  rank: number;
}

const ITEMS_PER_PAGE = 100;

export default function Dashboard() {
  const { user, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string[]>([]);
  const [excludeInstitutional, setExcludeInstitutional] = useState(true); // Default ON
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Build query parameters for server-side filtering
  const queryParams = useMemo(() => ({
    search: searchQuery.trim(),
    states: stateFilter,
    specialties: specialtyFilter,
    excludeInstitutional
  }), [searchQuery, stateFilter, specialtyFilter, excludeInstitutional]);

  // Fetch data from outlier_registry with server-side filtering
  const { data: registryData, isLoading: providersLoading } = useQuery({
    queryKey: ['outlier-registry', queryParams],
    queryFn: async () => {
      let query = supabase
        .from('outlier_registry')
        .select('npi, provider_name, specialty, state, years_as_outlier, max_x_vs_peer_median, max_total_allowed')
        .order('max_x_vs_peer_median', { ascending: false, nullsFirst: false })
        .order('max_total_allowed', { ascending: false, nullsFirst: false });

      // Server-side institutional filter
      if (queryParams.excludeInstitutional) {
        query = query.eq('is_institutional', false);
      }

      // Server-side state filter
      if (queryParams.states.length > 0) {
        query = query.in('state', queryParams.states);
      }

      // Server-side specialty filter
      if (queryParams.specialties.length > 0) {
        query = query.in('specialty', queryParams.specialties);
      }

      // Server-side search filter
      if (queryParams.search) {
        query = query.or(`provider_name.ilike.%${queryParams.search}%,npi.ilike.%${queryParams.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OutlierRegistry[];
    },
  });

  // Fetch totals and filter options (unfiltered for stats)
  const { data: totalStats } = useQuery({
    queryKey: ['outlier-registry-stats'],
    queryFn: async () => {
      // Total count (excluding institutional by default for consistency)
      const { count: totalCount } = await supabase
        .from('outlier_registry')
        .select('*', { count: 'exact', head: true })
        .eq('is_institutional', false);

      // Count with years_as_outlier >= 2 (multi-year outliers)
      const { count: multiYearCount } = await supabase
        .from('outlier_registry')
        .select('*', { count: 'exact', head: true })
        .eq('is_institutional', false)
        .gte('years_as_outlier', 2);

      return {
        totalCount: totalCount || 0,
        multiYearCount: multiYearCount || 0
      };
    },
  });

  // Fetch distinct states and specialties for filter dropdowns
  const { data: filterOptions } = useQuery({
    queryKey: ['outlier-registry-filter-options'],
    queryFn: async () => {
      // Get distinct states
      const { data: statesData } = await supabase
        .from('outlier_registry')
        .select('state')
        .not('state', 'is', null);
      
      // Get distinct specialties
      const { data: specialtiesData } = await supabase
        .from('outlier_registry')
        .select('specialty')
        .not('specialty', 'is', null);

      const states = [...new Set(statesData?.map(s => s.state).filter(Boolean) as string[])].sort();
      const specialties = [...new Set(specialtiesData?.map(s => s.specialty).filter(Boolean) as string[])].sort();

      return { states, specialties };
    },
  });

  // Transform registry data to ranked providers
  const rankedProviders = useMemo((): RankedProvider[] => {
    if (!registryData || registryData.length === 0) return [];
    
    return registryData.map((row, index) => ({
      npi: row.npi,
      provider_name: row.provider_name || `Provider NPI ${row.npi}`,
      specialty: row.specialty || 'Unknown',
      state: row.state || 'Unknown',
      yearsAsOutlier: row.years_as_outlier || 0,
      maxPeerRatio: row.max_x_vs_peer_median,
      maxTotalAllowed: row.max_total_allowed || 0,
      rank: index + 1  // Rank based on server-side ordering
    }));
  }, [registryData]);

  // Pagination
  const totalPages = Math.ceil(rankedProviders.length / ITEMS_PER_PAGE);
  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return rankedProviders.slice(start, start + ITEMS_PER_PAGE);
  }, [rankedProviders, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stateFilter, specialtyFilter, excludeInstitutional]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleRowClick = (npi: string, rank: number, totalCount: number) => {
    navigate(`/provider/${npi}?rank=${rank}&total=${totalCount}`);
  };

  const getProviderDisplayName = (provider: RankedProvider) => {
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStateFilter([]);
    setSpecialtyFilter([]);
    setExcludeInstitutional(true); // Reset to default ON
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <DisclaimerBanner variant="detailed" />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Outlier Provider Rankings</h1>
        <p className="text-muted-foreground">
          Ranked by multiples above specialty-state peer median. Click a row for details.
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outlier Providers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (totalStats?.totalCount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Statistical outliers vs peer median
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multi-Year Outliers</CardTitle>
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Alert</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (totalStats?.multiYearCount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Outliers in 2+ years
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Period</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2022-2023</div>
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
            Outlier Rankings by Peer Comparison
          </CardTitle>
          <CardDescription>
            These providers are statistical outliers within their specialty-state peer groups. 
            Rankings are by × above peer median (highest first). Peer medians are computed during offline 
            analysis using the full peer group; the platform displays only the verified outlier subset. 
            Providers without peer data appear at the bottom.
          </CardDescription>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
            <span><span className="font-medium">Data Source:</span> 2022–2023 Medicare Part B Claims</span>
            <span className="text-muted-foreground/50">|</span>
            <span><span className="font-medium">Last Analysis:</span> January 2025</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <ProviderFilters
            states={filterOptions?.states || []}
            specialties={filterOptions?.specialties || []}
            selectedStates={stateFilter}
            selectedSpecialties={specialtyFilter}
            onStateChange={setStateFilter}
            onSpecialtyChange={setSpecialtyFilter}
            onClearAll={handleClearAllFilters}
            totalCount={totalStats?.totalCount || 0}
            filteredCount={rankedProviders.length}
            excludeInstitutional={excludeInstitutional}
            onExcludeInstitutionalChange={setExcludeInstitutional}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Table */}
          {providersLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rankedProviders.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              {(totalStats?.totalCount || 0) === 0 
                ? 'No data found in outlier_registry table.'
                : 'No providers match the current filters.'}
            </div>
          ) : (
            <>
              {/* Pagination info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, rankedProviders.length)} of {rankedProviders.length.toLocaleString()} verified outliers
                </span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>NPI</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">× Above Median</TableHead>
                      <TableHead className="text-right">Max Allowed</TableHead>
                      <TableHead className="text-center">Years Outlier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProviders.map((provider) => {
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
                          <TableCell className="text-right">
                            {provider.maxPeerRatio !== null ? (
                              <Badge variant="destructive" className="font-mono">
                                {provider.maxPeerRatio.toFixed(1)}×
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(provider.maxTotalAllowed)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={provider.yearsAsOutlier >= 2 ? "destructive" : "secondary"}>
                              {provider.yearsAsOutlier}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, idx) => (
                      <PaginationItem key={idx}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Watermark footer for screenshot protection */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t space-y-1">
        <p>Statistical analysis • Public data • Not a finding of wrongdoing</p>
        <p className="text-muted-foreground/70">
          Outputs are for internal analysis and screening only and may not be publicly 
          distributed or presented as factual findings.
        </p>
      </div>
    </div>
  );
}
