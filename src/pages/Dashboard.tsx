import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, Loader2, CheckCircle2 } from 'lucide-react';
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
  maxAllowedAmount: number;
  yearsVerified: number;
  rank: number;
}

const ITEMS_PER_PAGE = 100;

// Institutional specialties to exclude by default
const INSTITUTIONAL_SPECIALTIES = [
  'pharmacy',
  'centralized flu',
  'portable xray supplier',
  'clinical laboratory',
  'idtf',
  'ambulance service',
  'ambulatory surgical'
];

export default function Dashboard() {
  const { user, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  
  // Filter state
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string[]>([]);
  const [excludeInstitutional, setExcludeInstitutional] = useState(true); // Default ON
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch ALL data from anomalies_offline using pagination to bypass server limits
  const fetchAllAnomalies = async (): Promise<AnomalyOffline[]> => {
    const PAGE_SIZE = 1000;
    let allData: AnomalyOffline[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('anomalies_offline')
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allData;
  };

  const { data: anomaliesOffline, isLoading: providersLoading } = useQuery({
    queryKey: ['anomalies-offline-all'],
    queryFn: fetchAllAnomalies,
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
      const maxAllowedAmount = p.years.length > 0 
        ? Math.max(...p.years.map(y => y.total_allowed_amount)) 
        : 0;
      
      // Count years where percentile >= 0.995 (99.5th) - all are verified
      const yearsVerified = p.years.filter(y => y.percentile_rank >= 0.995).length;
      
      return {
        ...p,
        maxAllowedAmount,
        yearsVerified,
        rank: 0
      };
    });
    
    // Sort by max allowed amount DESC (ranking by dollar amount)
    providers.sort((a, b) => {
      if (b.maxAllowedAmount !== a.maxAllowedAmount) 
        return b.maxAllowedAmount - a.maxAllowedAmount;
      return b.yearsVerified - a.yearsVerified;
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
      // Institutional filter (default ON - excludes institutional entities)
      if (excludeInstitutional) {
        const specialtyLower = p.specialty.toLowerCase();
        if (INSTITUTIONAL_SPECIALTIES.some(inst => specialtyLower.includes(inst))) {
          return false;
        }
      }
      if (stateFilter.length > 0 && !stateFilter.includes(p.state)) return false;
      if (specialtyFilter.length > 0 && !specialtyFilter.includes(p.specialty)) return false;
      return true;
    });
  }, [rankedProviders, stateFilter, specialtyFilter, excludeInstitutional]);

  // Pagination
  const totalPages = Math.ceil(filteredProviders.length / ITEMS_PER_PAGE);
  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProviders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProviders, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [stateFilter, specialtyFilter, excludeInstitutional]);

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

  // Count providers verified in ALL years
  const allYearsVerifiedCount = rankedProviders.filter(p => 
    p.yearsVerified === uniqueYears.length && uniqueYears.length > 0
  ).length;

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

  const getProviderDisplayName = (provider: AggregatedProvider) => {
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  const handleClearAllFilters = () => {
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
        <h1 className="text-3xl font-bold tracking-tight">Verified Outlier Registry</h1>
        <p className="text-muted-foreground">
          Confirmed Top 0.5% providers by allowed amount. Click a row for details.
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
            <CardTitle className="text-sm font-medium">Total Verified Outliers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : rankedProviders.length.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmed Top 0.5% providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Both Years</CardTitle>
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Alert</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : allYearsVerifiedCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Top 0.5% in all analysis years
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
            Verified Outlier Rankings
          </CardTitle>
          <CardDescription>
            These providers are confirmed statistical outliers within their specialty and state peer groups. 
            Rankings are by total allowed amount (descending).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <ProviderFilters
            states={filterOptions.states}
            specialties={filterOptions.specialties}
            selectedStates={stateFilter}
            selectedSpecialties={specialtyFilter}
            onStateChange={setStateFilter}
            onSpecialtyChange={setSpecialtyFilter}
            onClearAll={handleClearAllFilters}
            totalCount={rankedProviders.length}
            filteredCount={filteredProviders.length}
            excludeInstitutional={excludeInstitutional}
            onExcludeInstitutionalChange={setExcludeInstitutional}
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
            <>
              {/* Pagination info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProviders.length)} of {filteredProviders.length.toLocaleString()} verified outliers
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
                      <TableHead className="text-right">Max Allowed Amount</TableHead>
                      {uniqueYears.map(year => (
                        <TableHead key={year} className="text-center">{year}</TableHead>
                      ))}
                      <TableHead className="text-center">Top 0.5% (Verified)</TableHead>
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
                          <TableCell className="text-right font-mono">
                            {formatCurrency(provider.maxAllowedAmount)}
                          </TableCell>
                          {uniqueYears.map(year => {
                            const yearData = provider.years.find(y => y.year === year);
                            const isVerified = yearData && yearData.percentile_rank >= 0.995;
                            return (
                              <TableCell key={year} className="text-center">
                                {isVerified ? (
                                  <CheckCircle2 className="h-5 w-5 text-destructive mx-auto" />
                                ) : yearData ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="font-mono">
                              ✓ Verified
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
