import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { BarChart3, TrendingUp, Loader2, Database, Info, Save, X } from 'lucide-react';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { ProviderFilters } from '@/components/ProviderFilters';
import { useToast } from '@/hooks/use-toast';
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

interface QueryParams {
  search: string;
  states: string[];
  specialties: string[];
  excludeInstitutional: boolean;
}

const ITEMS_PER_PAGE = 50;
const FILTER_STORAGE_KEY = 'outlier-dashboard-default-filters';

export default function Dashboard() {
  const { user, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // State for saved filter defaults (avoids localStorage in render)
  const [hasSavedDefault, setHasSavedDefault] = useState(false);

  // On mount: check for saved defaults and restore if no URL params
  useEffect(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    setHasSavedDefault(!!saved);
    
    if (!location.search && saved) {
      setSearchParams(new URLSearchParams(saved), { replace: true });
    }
  }, []);

  const handleSaveAsDefault = () => {
    localStorage.setItem(FILTER_STORAGE_KEY, searchParams.toString());
    setHasSavedDefault(true);
    toast({ title: "Filters saved as default" });
  };

  const handleClearSavedDefault = () => {
    localStorage.removeItem(FILTER_STORAGE_KEY);
    setHasSavedDefault(false);
    toast({ title: "Default filters cleared" });
  };
  
  // Read filter state from URL
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const stateFilter = searchParams.get('states')?.split(',').filter(Boolean) || [];
  const specialtyFilter = searchParams.get('specs')?.split(',').filter(Boolean) || [];
  const excludeInstitutional = searchParams.get('exInst') !== 'false'; // default true

  // Build query parameters for server-side filtering
  const queryParams = useMemo((): QueryParams => ({
    search: searchQuery.trim(),
    states: stateFilter,
    specialties: specialtyFilter,
    excludeInstitutional
  }), [searchQuery, stateFilter, specialtyFilter, excludeInstitutional]);

  // Shared filter builder - ensures count and data queries use identical filters
  const applyFilters = useCallback((query: any, params: QueryParams) => {
    // ONLY apply institutional filter when toggle is ON
    if (params.excludeInstitutional) {
      query = query.eq('is_institutional', false);
    }
    if (params.states.length > 0) {
      query = query.in('state', params.states);
    }
    if (params.specialties.length > 0) {
      query = query.in('specialty', params.specialties);
    }
    if (params.search) {
      // Sanitize: commas and parentheses break PostgREST .or() syntax
      const safeSearch = params.search.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
      if (safeSearch) {
        query = query.or(`provider_name.ilike.%${safeSearch}%,npi.ilike.%${safeSearch}%`);
      }
    }
    return query;
  }, []);

  // Fetch filtered count (for accurate pagination)
  const { data: filteredCount } = useQuery({
    queryKey: ['outlier-count', queryParams],
    queryFn: async () => {
      let query = supabase
        .from('outlier_registry')
        .select('*', { count: 'exact', head: true });
      query = applyFilters(query, queryParams);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch data with server-side pagination
  const { data: registryData, isLoading: providersLoading } = useQuery({
    queryKey: ['outlier-registry', queryParams, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('outlier_registry')
        .select('npi, provider_name, specialty, state, years_as_outlier, max_x_vs_peer_median, max_total_allowed')
        .order('max_x_vs_peer_median', { ascending: false, nullsFirst: false })
        .order('max_total_allowed', { ascending: false, nullsFirst: false });

      query = applyFilters(query, queryParams);
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return data as OutlierRegistry[];
    },
  });

  // Fetch dynamic year range (must be before totalStats which depends on it)
  const { data: yearRange } = useQuery({
    queryKey: ['year-range'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_data_year_range');
      if (error) throw error;
      return data?.[0] as { min_year: number; max_year: number } | undefined;
    }
  });

  // Fetch totals with dynamic full-period calculation
  const { data: totalStats, isLoading: statsLoading } = useQuery({
    queryKey: ['outlier-registry-stats', yearRange?.min_year, yearRange?.max_year, excludeInstitutional],
    enabled: !!yearRange,
    queryFn: async () => {
      const totalYears = (yearRange!.max_year - yearRange!.min_year + 1);

      const applyStatsFilter = (query: any) =>
        excludeInstitutional ? query.eq('is_institutional', false) : query;

      // Total count (select 'npi' for lean query)
      const { count: totalCount, error: e1 } = await applyStatsFilter(
        supabase.from('outlier_registry').select('npi', { count: 'exact', head: true })
      );
      if (e1) throw e1;

      // Full-period outliers (outliers in ALL years)
      const { count: fullPeriodCount, error: e2 } = await applyStatsFilter(
        supabase.from('outlier_registry').select('npi', { count: 'exact', head: true })
          .gte('years_as_outlier', totalYears)
      );
      if (e2) throw e2;

      return { 
        totalCount: totalCount || 0, 
        fullPeriodCount: fullPeriodCount || 0, 
        totalYears 
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

  // Calculate pagination from server-side count
  const totalPages = Math.ceil((filteredCount || 0) / ITEMS_PER_PAGE);

  // Transform registry data to ranked providers with page offset
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
      // Rank accounts for pagination offset
      rank: (currentPage - 1) * ITEMS_PER_PAGE + index + 1
    }));
  }, [registryData, currentPage]);

  // URL update helpers
  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset to page 1 on filter change (unless updating page itself)
    if (!('page' in updates)) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const setPage = useCallback((page: number) => {
    updateFilters({ page: String(page) });
  }, [updateFilters]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleRowClick = (npi: string, rank: number, totalCount: number) => {
    // Preserve current query string for return navigation
    navigate(`/provider/${npi}?rank=${rank}&total=${totalCount}&returnTo=${encodeURIComponent(location.search)}`);
  };

  const getProviderDisplayName = (provider: RankedProvider) => {
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  const handleClearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Generate page numbers for pagination - show up to 5 pages around current
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate window of 5 pages around current
      const windowStart = Math.max(2, currentPage - 2);
      const windowEnd = Math.min(totalPages - 1, currentPage + 2);
      
      // Add left ellipsis if needed
      if (windowStart > 2) pages.push('ellipsis');
      
      // Add pages in window (up to 5 pages)
      for (let i = windowStart; i <= windowEnd; i++) {
        pages.push(i);
      }
      
      // Add right ellipsis if needed
      if (windowEnd < totalPages - 1) pages.push('ellipsis');
      
      // Always show last page
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
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Full-Period Outliers
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Providers verified as outliers in every year of the data-available window ({yearRange?.min_year || '2021'}–{yearRange?.max_year || '2023'}).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Alert</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (totalStats?.fullPeriodCount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Outliers in all {totalStats?.totalYears || '—'} years ({yearRange ? `${yearRange.min_year}–${yearRange.max_year}` : '—'})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Available</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {yearRange ? `${yearRange.min_year}–${yearRange.max_year}` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Years in dataset
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registry Window</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2022–2023</div>
            <p className="text-xs text-muted-foreground">
              Persistence requirement
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
            <span><span className="font-medium">Data Source:</span> {yearRange ? `${yearRange.min_year}–${yearRange.max_year}` : '2022–2023'} Medicare Part B Claims</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <ProviderFilters
            states={filterOptions?.states || []}
            specialties={filterOptions?.specialties || []}
            selectedStates={stateFilter}
            selectedSpecialties={specialtyFilter}
            onStateChange={(states) => updateFilters({ states: states.join(',') || null })}
            onSpecialtyChange={(specs) => updateFilters({ specs: specs.join(',') || null })}
            onClearAll={handleClearAllFilters}
            totalCount={totalStats?.totalCount || 0}
            filteredCount={filteredCount || 0}
            excludeInstitutional={excludeInstitutional}
            onExcludeInstitutionalChange={(val) => updateFilters({ exInst: val ? null : 'false' })}
            searchQuery={searchQuery}
            onSearchChange={(q) => updateFilters({ q: q || null })}
          />

          {/* Filter persistence buttons */}
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={handleSaveAsDefault}>
              <Save className="mr-1 h-3 w-3" />
              Save as default
            </Button>
            {hasSavedDefault && (
              <Button variant="ghost" size="sm" onClick={handleClearSavedDefault}>
                <X className="mr-1 h-3 w-3" />
                Clear default
              </Button>
            )}
          </div>

          {/* Table */}
          {providersLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (filteredCount || 0) === 0 ? (
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
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCount || 0)} of {(filteredCount || 0).toLocaleString()} verified outliers
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
                      <TableHead className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center justify-end gap-1 cursor-help">
                                × Above Median
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">The ratio of this provider's allowed amount per beneficiary compared to the median of their specialty-state peer group.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead className="text-right">Max Allowed</TableHead>
                      <TableHead className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center justify-center gap-1 cursor-help">
                                Years Outlier
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Number of years this provider was verified as a top 0.5% outlier within their peer group.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedProviders.map((provider) => {
                      return (
                        <TableRow
                          key={provider.npi}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(provider.npi, provider.rank, filteredCount || 0)}
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
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, idx) => (
                      <PaginationItem key={idx}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setPage(page)}
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
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
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
