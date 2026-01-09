import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Clock, CheckCircle2, Info } from 'lucide-react';
import { PossibleExplanations } from '@/components/PossibleExplanations';
import { useEffect, useMemo } from 'react';

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
  // Peer comparison fields
  peer_median_allowed: number | null;
  peer_p75_allowed: number | null;
  peer_group_size: number | null;
  allowed_vs_peer_median: number | null;
  allowed_vs_peer_median_log: number | null;
}

interface FlagYear {
  year: number;
  percentile_rank: number;
  value: number;
  peer_median_allowed: number | null;
  peer_group_size: number | null;
  allowed_vs_peer_median: number | null;
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

  // Transform anomaly data to flag years format with peer comparison
  const flagYears = useMemo(() => {
    if (!anomalyData) return [];
    return anomalyData.map(row => ({
      year: row.year,
      percentile_rank: Number(row.percentile_rank) || 0,
      value: Number(row.total_allowed_amount) || 0,
      peer_median_allowed: row.peer_median_allowed ? Number(row.peer_median_allowed) : null,
      peer_group_size: row.peer_group_size ? Number(row.peer_group_size) : null,
      allowed_vs_peer_median: row.allowed_vs_peer_median ? Number(row.allowed_vs_peer_median) : null
    }));
  }, [anomalyData]);

  const yearsVerified = flagYears.filter(y => y.percentile_rank >= 0.995).length;

  // Helper: Get best available peer ratio across all years
  const bestPeerRatio = useMemo(() => {
    const withRatio = flagYears.filter(y => y.allowed_vs_peer_median !== null);
    if (withRatio.length === 0) return null;
    // Return highest ratio for headline
    return Math.max(...withRatio.map(y => y.allowed_vs_peer_median!));
  }, [flagYears]);

  // Helper: Check if peer data is available for a given row
  const getPeerDataStatus = (row: FlagYear) => {
    if (row.peer_group_size !== null && row.peer_group_size < 5) {
      return { available: false, reason: 'Peer group too small (< 5 providers)' };
    }
    if (row.peer_median_allowed === null) {
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
              {rank && (
                <p className="text-sm text-muted-foreground mt-2">
                  Ranked #{rank} by Medicare billing volume among {totalProviders.toLocaleString()} verified outliers
                </p>
              )}
            </div>
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
                {flagYears[0]?.peer_group_size !== null ? (
                  <span className="font-semibold">
                    {flagYears[0].peer_group_size?.toLocaleString()} providers
                    {flagYears[0].peer_group_size !== null && flagYears[0].peer_group_size < 5 && (
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
                  {formatCurrency(Math.max(...flagYears.map(y => y.value)))}
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
                {bestPeerRatio && flagYears[0]?.peer_group_size ? (
                  <>
                    This provider billed <strong>{bestPeerRatio.toFixed(1)}× the peer median</strong> among{' '}
                    {flagYears[0].peer_group_size.toLocaleString()} {provider.specialty} providers in {provider.state}.
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

      {/* Per-Year Breakdown Table */}
      {flagYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Per-Year Statistical Breakdown
            </CardTitle>
            <CardDescription>
              Peer comparison and verification status for each analysis year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Total Allowed</TableHead>
                  <TableHead className="text-right">Peer Median</TableHead>
                  <TableHead className="text-right">vs Median</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      Percentile
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Percentile rank within specialty-state peer group
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagYears.map(fy => {
                  const isVerified = fy.percentile_rank >= 0.995;
                  const peerStatus = getPeerDataStatus(fy);
                  
                  return (
                    <TableRow key={fy.year}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(fy.value)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {peerStatus.available ? (
                          <span className="font-mono">{formatCurrency(fy.peer_median_allowed!)}</span>
                        ) : (
                          <span className="text-xs italic">{peerStatus.reason}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {peerStatus.available ? (
                          <Badge variant="outline" className="font-mono">
                            {fy.allowed_vs_peer_median!.toFixed(1)}×
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{peerStatus.reason}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isVerified ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-muted-foreground">
                              Top {((1 - fy.percentile_rank) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Top {((1 - fy.percentile_rank) * 100).toFixed(1)}%
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
