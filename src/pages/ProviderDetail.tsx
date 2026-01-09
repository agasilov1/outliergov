import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
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

  // Transform anomaly data to flag years format
  const flagYears = useMemo(() => {
    if (!anomalyData) return [];
    return anomalyData.map(row => ({
      year: row.year,
      percentile_rank: Number(row.percentile_rank) || 0,
      value: Number(row.total_allowed_amount) || 0
    }));
  }, [anomalyData]);

  const yearsVerified = flagYears.filter(y => y.percentile_rank >= 0.995).length;

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
            <Badge variant="destructive" className="px-3 py-1">
              ✓ Top 0.5% Verified
            </Badge>
          </div>
        </CardHeader>
        {flagYears.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Years Verified: </span>
                <span className="font-semibold">{yearsVerified} of {flagYears.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Allowed Amount: </span>
                <span className="font-semibold">
                  {formatCurrency(Math.max(...flagYears.map(y => y.value)))}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Verification Statement Card */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">
                Verified Statistical Outlier
              </h3>
              <p className="text-sm mt-1">
                This provider is a confirmed Top 0.5% statistical outlier by allowed amount 
                within their specialty-state peer group for {yearsVerified} year(s). 
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
              Verified Top 0.5% status for each analysis year (statistical variance only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Total Allowed Amount</TableHead>
                  <TableHead className="text-center">Top 0.5% (Verified)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagYears.map(fy => {
                  const isVerified = fy.percentile_rank >= 0.995;
                  
                  return (
                    <TableRow key={fy.year}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(fy.value)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isVerified ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Verified</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
