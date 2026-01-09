import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PossibleExplanations } from '@/components/PossibleExplanations';
import { ConfidenceBadge, getConfidenceLevel, getConfidenceLabel } from '@/components/ConfidenceBadge';
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

  // Calculate confidence - all providers in anomalies_offline are verified outliers
  const minPeerSize = 20; // Assumed since not available in anomalies_offline
  const confidence = getConfidenceLevel(minPeerSize);
  const confidenceLabel = getConfidenceLabel(confidence);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentile = (value: number) => {
    // Convert from decimal (0.995) to percentage (99.5th)
    const pct = value * 100;
    if (pct >= 99.9) return '≥99.9th';
    return `${pct.toFixed(1)}th`;
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
                  Ranked #{rank} of {totalProviders.toLocaleString()} verified statistical outliers
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <ConfidenceBadge confidence={confidence} className="px-3 py-1" />
              <span className="text-xs text-muted-foreground">{confidenceLabel}</span>
            </div>
          </div>
        </CardHeader>
        {flagYears.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              {flagYears.map(fy => (
                <div key={fy.year}>
                  <span className="text-muted-foreground">{fy.year} Percentile Rank: </span>
                  <span className="font-semibold">{formatPercentile(fy.percentile_rank)}</span>
                </div>
              ))}
              <div>
                <span className="text-muted-foreground">Years Above Threshold: </span>
                <span className="font-semibold">{flagYears.filter(y => y.percentile_rank >= 0.995).length}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Classification Explanation Card */}
      <Card className={
        confidence === 'high' 
          ? "border-emerald-500/30 bg-emerald-500/5" 
          : confidence === 'medium'
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-gray-500/30 bg-gray-500/5"
      }>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ConfidenceBadge confidence={confidence} />
            <div>
              <h3 className={`font-semibold ${
                confidence === 'high' 
                  ? 'text-emerald-700' 
                  : confidence === 'medium'
                  ? 'text-amber-700'
                  : 'text-gray-700'
              }`}>
                {confidenceLabel}
              </h3>
              <p className="text-sm mt-1">
                This provider's total allowed amount ranked at or above the 99.5th percentile 
                within their peer group for {flagYears.filter(y => y.percentile_rank >= 0.995).length} year(s). 
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
              Authoritative percentile ranks for each analysis year (statistical variance only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Provider Value</TableHead>
                  <TableHead className="text-right">Percentile Rank</TableHead>
                  <TableHead className="text-center">Met Threshold (≥99.5th)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagYears.map(fy => {
                  const meetsThreshold = fy.percentile_rank >= 0.995;
                  
                  return (
                    <TableRow key={fy.year}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(fy.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={meetsThreshold ? 'destructive' : 'secondary'} className="font-mono">
                          {formatPercentile(fy.percentile_rank)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {meetsThreshold ? (
                          <CheckCircle2 className="h-5 w-5 text-destructive mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
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
    </div>
  );
}
