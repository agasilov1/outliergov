import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Provider {
  id: string;
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
}

interface AnomalyFlagV2 {
  id: string;
  flagged: boolean;
  flag_reason: string | null;
  metric_name: string;
  rule_set_version: string;
  peer_group_key: string;
  peer_group_version: string;
  threshold_percentile_required: number;
  min_peer_size_required: number;
  consecutive_years_required: number;
  computed_at: string;
}

interface AnomalyFlagYear {
  year: number;
  percentile_rank: number;
  peer_size: number;
  value: number;
  p995_threshold: number;
}

interface Metric {
  year: number;
  total_allowed_amount: number;
}

interface PeerStats {
  year: number;
  median: number;
  p95: number;
  p99: number;
  p995: number;
  mean: number;
  peer_size: number;
}

interface DatasetRelease {
  id: string;
  release_label: string;
  dataset_key: string;
  ingested_at: string | null;
  source_url: string | null;
}

interface ComputeRun {
  id: string;
  rule_set_version: string;
  finished_at: string | null;
}

interface ProviderBriefProps {
  provider: Provider;
  anomalyFlagV2: AnomalyFlagV2 | null;
  flagYears: AnomalyFlagYear[];
  metrics: Metric[];
  peerStats: PeerStats[];
  datasetRelease?: DatasetRelease | null;
  computeRun?: ComputeRun | null;
  rank?: number | null;
  totalProviders?: number | null;
  onClose: () => void;
}

export function ProviderBrief({ 
  provider, 
  anomalyFlagV2, 
  flagYears,
  metrics, 
  peerStats,
  datasetRelease,
  computeRun,
  rank,
  totalProviders,
  onClose 
}: ProviderBriefProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = async () => {
    // Log export action
    if (user) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'export_brief',
        entity_type: 'provider',
        entity_id: provider.id,
        metadata: {
          provider_name: provider.provider_name,
          npi: provider.npi,
          dataset_release_id: datasetRelease?.id,
          compute_run_id: computeRun?.id,
          rank
        }
      });
    }

    window.print();
  };

  const uniqueYears = [...new Set(flagYears.map(fy => fy.year))].sort();
  const yearsVerified = flagYears.filter(fy => fy.percentile_rank >= 99.5).length;

  const getProviderDisplayName = () => {
    if (provider.provider_name === provider.npi) {
      return `Provider NPI ${provider.npi}`;
    }
    return provider.provider_name || `Provider NPI ${provider.npi}`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            Provider Statistical Brief
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 print:p-8">
          {/* Header */}
          <div className="border-b pb-4">
            <h1 className="text-2xl font-bold">Provider Statistical Brief</h1>
            <p className="text-sm text-muted-foreground">
              Generated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* Statistical Ranking Section */}
          {anomalyFlagV2 && (
            <section className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <Badge variant="destructive" className="px-3 py-1">
                  ✓ Top 0.5% Verified
                </Badge>
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive">
                    Verified Statistical Outlier
                  </h3>
                  
                  {/* Ranking info */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    {rank && totalProviders && (
                      <div>
                        <span className="text-muted-foreground">Rank: </span>
                        <span className="font-semibold">#{rank} of {totalProviders.toLocaleString()}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <span className="font-semibold">Top 0.5% Verified</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Years Verified: </span>
                      <span className="font-semibold">{yearsVerified} of {uniqueYears.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Provider Identification */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Provider Identification</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium text-muted-foreground">Provider Name</td>
                  <td className="py-2">{getProviderDisplayName()}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-muted-foreground">NPI</td>
                  <td className="py-2">{provider.npi}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-muted-foreground">Specialty</td>
                  <td className="py-2">{provider.specialty}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-muted-foreground">State</td>
                  <td className="py-2">{provider.state}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Data Lineage */}
          {datasetRelease && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Data Lineage</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-muted-foreground">Dataset</td>
                    <td className="py-2">{datasetRelease.release_label}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-muted-foreground">Ingested</td>
                    <td className="py-2">{formatDate(datasetRelease.ingested_at)}</td>
                  </tr>
                  {datasetRelease.source_url && (
                    <tr className="border-b">
                      <td className="py-2 font-medium text-muted-foreground">Source</td>
                      <td className="py-2">{datasetRelease.source_url}</td>
                    </tr>
                  )}
                  {computeRun && (
                    <>
                      <tr className="border-b">
                        <td className="py-2 font-medium text-muted-foreground">Rule Version</td>
                        <td className="py-2 font-mono text-xs">{computeRun.rule_set_version}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium text-muted-foreground">Compute Run ID</td>
                        <td className="py-2 font-mono text-xs">{computeRun.id}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {/* Statistical Summary - Per Year */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Statistical Summary</h2>
            {anomalyFlagV2 && (
              <p className="mb-4 text-sm">
                This provider is a confirmed Top 0.5% statistical outlier by allowed amount 
                within their peer group ({anomalyFlagV2.peer_group_key}) for {yearsVerified} year(s).
                {!anomalyFlagV2.flagged && anomalyFlagV2.flag_reason && (
                  <span className="block mt-2 text-amber-600">
                    <strong>Classification Note:</strong> {anomalyFlagV2.flag_reason}
                  </span>
                )}
              </p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 text-left font-medium">Metric</th>
                  {uniqueYears.map(year => (
                    <th key={year} className="py-2 text-right font-medium">{year}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">Provider Total Allowed Amount</td>
                  {uniqueYears.map(year => {
                    const metric = metrics.find(m => m.year === year);
                    return (
                      <td key={year} className="py-2 text-right">
                        {metric ? formatCurrency(Number(metric.total_allowed_amount)) : '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Top 0.5% (Verified)</td>
                  {uniqueYears.map(year => {
                    const flagYear = flagYears.find(fy => fy.year === year);
                    const isVerified = flagYear && flagYear.percentile_rank >= 99.5;
                    return (
                      <td key={year} className="py-2 text-right">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">Verified</span>
                          </span>
                        ) : '-'}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Peer Group Size</td>
                  {uniqueYears.map(year => {
                    const flagYear = flagYears.find(fy => fy.year === year);
                    return (
                      <td key={year} className="py-2 text-right">
                        {flagYear ? `${flagYear.peer_size} providers` : '-'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </section>

          {/* Methodology Reference */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Methodology</h2>
            <p className="text-sm">
              Peer groups are defined by {anomalyFlagV2?.peer_group_key || 'specialty and state'}. 
              Providers are verified as Top 0.5% outliers based on {anomalyFlagV2?.metric_name || 'total allowed amounts'} 
              within each peer group for each calendar year. Rankings are by total allowed amount (descending).
            </p>
            {anomalyFlagV2 && (
              <p className="mt-2 text-sm">
                <strong>Rule Version:</strong> {anomalyFlagV2.rule_set_version} | 
                <strong> Computed:</strong> {formatDate(anomalyFlagV2.computed_at)}
              </p>
            )}
          </section>

          {/* Disclaimer */}
          <section className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <h2 className="mb-2 font-semibold">Important Disclaimer</h2>
            <p className="text-sm">
              <strong>This ranking reflects statistical variance only and is intended for prioritization, not conclusions.</strong>
            </p>
            <p className="text-sm mt-2">
              This report identifies verified statistical outliers based on publicly available Medicare 
              payment data. A Top 0.5% verification indicates that a provider received more in 
              allowed amounts than 99.5% of peers in their specialty and state. <strong>This is not 
              evidence of wrongdoing.</strong> Many legitimate factors can explain high volumes, 
              including practice size, patient complexity, subspecialty focus, or geographic 
              patient catchment areas.
            </p>
            <p className="mt-2 text-sm">
              This analysis is intended for research and preliminary review purposes only. 
              Any conclusions regarding provider conduct must be based on detailed chart review, 
              expert consultation, and independent verification of the underlying data.
            </p>
          </section>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            <p>OutlierGov Statistical Analysis Platform</p>
            <p>Free, open-source public accountability tool • MIT License</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
