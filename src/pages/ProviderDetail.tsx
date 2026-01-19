import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ArrowLeft, Clock, CheckCircle2, Info, Search, Download } from 'lucide-react';
import { PossibleExplanations } from '@/components/PossibleExplanations';
import { ProviderCharts } from '@/components/ProviderCharts';
import { useEffect, useMemo, useState } from 'react';

interface ProviderYearMetric {
  npi: string;
  year: number;
  provider_name: string | null;
  specialty: string | null;
  state: string | null;
  entity_type: string | null;
  tot_allowed_cents: number | null;
  tot_benes: number | null;
  tot_srvcs: number | null;
  allowed_per_bene_cents: number | null;
  peer_median_allowed_per_bene: number | null;
  peer_p75_allowed_per_bene: number | null;
  peer_p995_allowed_per_bene: number | null;
  peer_group_size: number | null;
  percentile_rank: number | null;
  x_vs_peer_median: number | null;
  verified_top_0_5: boolean | null;
}

interface FlagYear {
  year: number;
  percentile_rank: number;
  totalAllowedDollars: number;
  allowedPerBeneDollars: number | null;
  peerMedianPerBeneDollars: number | null;
  peerGroupSize: number | null;
  xVsPeerMedian: number | null;
  verifiedTop05: boolean;
  beneficiaries: number | null;
  services: number | null;
}

export default function ProviderDetail() {
  const { id: npi } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{npi: string, provider_name: string | null, specialty: string | null}[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Get rank and returnTo from URL params
  const rankFromUrl = searchParams.get('rank');
  const totalFromUrl = searchParams.get('total');
  const returnTo = searchParams.get('returnTo');
  const rank = rankFromUrl ? parseInt(rankFromUrl) : null;
  const totalProviders = totalFromUrl ? parseInt(totalFromUrl) : 5885;

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

  // Debounced search effect - now queries outlier_registry
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeout = setTimeout(async () => {
      // Sanitize: commas and parentheses break PostgREST .or() syntax
      const safeSearch = searchQuery.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
      const { data } = await supabase
        .from('outlier_registry')
        .select('npi, provider_name, specialty')
        .or(`provider_name.ilike.%${safeSearch}%,npi.ilike.%${safeSearch}%`)
        .limit(20);

      setSearchResults(data || []);
      setShowSearchResults(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Export PDF handler
  const handleExportPDF = () => {
    window.print();
  };

  // Handle back navigation - preserve query string
  const handleBack = () => {
    if (returnTo) {
      navigate(`/dashboard${decodeURIComponent(returnTo)}`);
    } else {
      navigate('/dashboard');
    }
  };

  // Fetch data from provider_year_metrics
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['provider-year-metrics', npi],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_year_metrics')
        .select('npi, year, provider_name, specialty, state, entity_type, tot_allowed_cents, tot_benes, tot_srvcs, allowed_per_bene_cents, peer_median_allowed_per_bene, peer_p75_allowed_per_bene, peer_p995_allowed_per_bene, peer_group_size, percentile_rank, x_vs_peer_median, verified_top_0_5')
        .eq('npi', npi)
        .order('year');
      if (error) throw error;
      return data as ProviderYearMetric[];
    },
    enabled: !!npi
  });

  // Derive provider info from metrics data
  const provider = useMemo(() => {
    if (!metricsData || metricsData.length === 0) return null;
    const first = metricsData[0];
    return {
      npi: first.npi,
      provider_name: first.provider_name || `Provider NPI ${first.npi}`,
      specialty: first.specialty || 'Unknown',
      state: first.state || 'Unknown',
      entity_type: first.entity_type
    };
  }, [metricsData]);

  // Helper: Convert cents to dollars
  const centsToDoallars = (cents: number | null): number | null => {
    if (cents === null) return null;
    return cents / 100;
  };

  // Transform metrics data to flag years format with per-bene data
  const flagYears = useMemo((): FlagYear[] => {
    if (!metricsData) return [];
    return metricsData.map(row => ({
      year: row.year,
      percentile_rank: Number(row.percentile_rank) || 0,
      totalAllowedDollars: centsToDoallars(row.tot_allowed_cents) || 0,
      allowedPerBeneDollars: centsToDoallars(row.allowed_per_bene_cents),
      peerMedianPerBeneDollars: row.peer_median_allowed_per_bene,  // Already in dollars
      peerGroupSize: row.peer_group_size,
      xVsPeerMedian: row.x_vs_peer_median,
      verifiedTop05: row.verified_top_0_5 === true,
      beneficiaries: row.tot_benes,
      services: row.tot_srvcs
    }));
  }, [metricsData]);

  const yearsVerified = flagYears.filter(y => y.verifiedTop05).length;

  // Helper: Get best available peer ratio across all years
  const bestPeerRatio = useMemo(() => {
    const withRatio = flagYears.filter(y => y.xVsPeerMedian !== null);
    if (withRatio.length === 0) return null;
    return Math.max(...withRatio.map(y => y.xVsPeerMedian!));
  }, [flagYears]);

  // Helper: Check if peer data is available for a given row
  const getPeerDataStatus = (row: FlagYear) => {
    if (row.peerGroupSize !== null && row.peerGroupSize < 5) {
      return { available: false, reason: 'Peer group too small (< 5 providers)' };
    }
    if (row.peerMedianPerBeneDollars === null) {
      return { available: false, reason: 'Peer data not available' };
    }
    return { available: true, reason: null };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getProviderDisplayName = () => {
    if (!provider) return 'Unknown';
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  // Entity type badge helper
  const getEntityTypeBadge = () => {
    if (!provider?.entity_type) return null;
    const isIndividual = provider.entity_type === 'I';
    return (
      <Badge variant="outline" className="ml-2 text-xs">
        {isIndividual ? 'Individual' : 'Organization'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading provider details...</div>
      </div>
    );
  }

  if (!provider || !metricsData || metricsData.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
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
    <div className="space-y-6 print-container">
      {/* Header with back button and search */}
      <div className="flex items-center justify-between gap-4 no-print">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Search bar */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search provider name or NPI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            className="pl-9"
          />
          {/* Dropdown results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.map(r => (
                <div
                  key={r.npi}
                  className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                  onMouseDown={() => {
                    navigate(`/provider/${r.npi}`);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                >
                  <div className="font-medium">{r.provider_name || `NPI ${r.npi}`}</div>
                  <div className="text-xs text-muted-foreground">{r.specialty} • NPI: {r.npi}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provider Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center">
                {getProviderDisplayName()}
                {getEntityTypeBadge()}
              </CardTitle>
              <CardDescription className="mt-1">
                NPI: {provider.npi} • {provider.specialty} • {provider.state}
              </CardDescription>
              {/* Rank indicator - fixed wording */}
              {rank && (
                <p className="text-sm text-muted-foreground mt-2">
                  Ranked #{rank} by × above peer median among {totalProviders.toLocaleString()} verified outliers
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Export PDF button */}
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="no-print">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              {/* PRIMARY BADGE: Peer ratio or fallback */}
              {bestPeerRatio ? (
                <Badge variant="destructive" className="px-4 py-2 text-base font-semibold">
                  {bestPeerRatio.toFixed(1)}× Peer Median
                </Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1">
                  Statistical Outlier
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        {flagYears.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              {/* PRIMARY: Peer comparison context */}
              <div>
                <span className="text-muted-foreground">Specialty-State Peer Group: </span>
                <span className="font-semibold">
                  {provider.specialty}, {provider.state}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Peer Group Size: </span>
                {flagYears[0]?.peerGroupSize !== null ? (
                  <span className="font-semibold">
                    {flagYears[0].peerGroupSize?.toLocaleString()} providers
                    {flagYears[0].peerGroupSize !== null && flagYears[0].peerGroupSize < 5 && (
                      <span className="text-xs text-amber-600 ml-2">(too small for ratio)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm italic text-muted-foreground">Not available</span>
                )}
              </div>
              
              {/* SECONDARY: Volume context */}
              <div>
                <span className="text-muted-foreground">Max Allowed Amount: </span>
                <span className="font-semibold">
                  {formatCurrency(Math.max(...flagYears.map(y => y.totalAllowedDollars)))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Years as Outlier: </span>
                <span className="font-semibold">{yearsVerified} of {flagYears.length}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Verification Statement Card - Peer-focused */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">
                Verified Statistical Outlier — {provider.specialty}, {provider.state}
              </h3>
              <p className="text-sm mt-1">
                {bestPeerRatio && flagYears[0]?.peerGroupSize ? (
                  <>
                    This provider's Medicare allowed amount per beneficiary was approximately <strong>{bestPeerRatio.toFixed(1)}× the peer median</strong> within a specialty–state comparison group of {flagYears[0].peerGroupSize.toLocaleString()} providers.
                    This is statistical variance only—not evidence of wrongdoing.
                  </>
                ) : (
                  <>
                    This provider is a confirmed statistical outlier within their specialty-state peer group.
                    This is statistical variance only—not evidence of any wrongdoing.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Charts */}
      {flagYears.length > 0 && (
        <ProviderCharts flagYears={flagYears} formatCurrency={formatCurrency} />
      )}

      {/* Per-Year Breakdown Table */}
      {flagYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Per-Year Statistical Breakdown
            </CardTitle>
            <CardDescription>
              Per-beneficiary comparison and verification status for each analysis year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Beneficiaries</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Total Allowed</TableHead>
                  <TableHead className="text-right">Allowed per Bene</TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center justify-end gap-1 cursor-help">
                            Peer Median (per bene)
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Rounded for display; ratios use exact values
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">vs Median</TableHead>
                  <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center justify-center gap-1 cursor-help">
                            Percentile
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Percentile rank within specialty-state peer group
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagYears.map(fy => {
                  const peerStatus = getPeerDataStatus(fy);
                  
                  return (
                    <TableRow key={fy.year}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fy.beneficiaries !== null 
                          ? fy.beneficiaries.toLocaleString()
                          : <span className="text-muted-foreground italic">N/A</span>
                        }
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fy.services !== null 
                          ? fy.services.toLocaleString()
                          : <span className="text-muted-foreground italic">N/A</span>
                        }
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(fy.totalAllowedDollars)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fy.allowedPerBeneDollars !== null 
                          ? formatCurrency(fy.allowedPerBeneDollars)
                          : <span className="text-muted-foreground italic">N/A</span>
                        }
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {peerStatus.available ? (
                          <span className="font-mono">{formatCurrency(fy.peerMedianPerBeneDollars!)}</span>
                        ) : (
                          <span className="text-xs italic">{peerStatus.reason}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {peerStatus.available && fy.xVsPeerMedian !== null ? (
                          <Badge variant="outline" className="font-mono">
                            {fy.xVsPeerMedian.toFixed(1)}×
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{peerStatus.reason}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {fy.verifiedTop05 ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-muted-foreground">
                              Top 0.5% (Verified)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Top {((1 - fy.percentile_rank) * 100).toFixed(2)}% (Not verified)
                          </span>
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

      {/* Watermark footer for screenshot protection */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t mt-6 space-y-1">
        <p>Statistical analysis • Public data • Not a finding of wrongdoing</p>
        <p className="text-muted-foreground/70">
          Outputs are for internal analysis and screening only and may not be publicly 
          distributed or presented as factual findings.
        </p>
      </div>
    </div>
  );
}
