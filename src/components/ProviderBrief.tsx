import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Provider {
  id: string;
  npi: string;
  provider_name: string;
  specialty: string;
  state: string;
}

interface AnomalyFlag {
  percentile_2023: number;
  percentile_2024: number;
  threshold_2023: number;
  threshold_2024: number;
  peer_group_size: number;
  rule_version: string;
  computed_at: string;
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
}

interface ProviderBriefProps {
  provider: Provider;
  anomalyFlag: AnomalyFlag;
  metrics: Metric[];
  peerStats: PeerStats[];
  onClose: () => void;
}

export function ProviderBrief({ provider, anomalyFlag, metrics, peerStats, onClose }: ProviderBriefProps) {
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

  const formatPercentile = (value: number) => {
    return `${value.toFixed(1)}th`;
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
          npi: provider.npi
        }
      });
    }

    window.print();
  };

  const metric2023 = metrics.find(m => m.year === 2023);
  const metric2024 = metrics.find(m => m.year === 2024);
  const stats2023 = peerStats.find(s => s.year === 2023);
  const stats2024 = peerStats.find(s => s.year === 2024);

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

          {/* Provider Identification */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Provider Identification</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium text-muted-foreground">Provider Name</td>
                  <td className="py-2">{provider.provider_name}</td>
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

          {/* Statistical Summary */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Statistical Summary</h2>
            <p className="mb-4 text-sm">
              This provider's total allowed amount ranked at or above the 99.5th percentile 
              within their peer group (same specialty and state) for both 2023 and 2024.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 text-left font-medium">Metric</th>
                  <th className="py-2 text-right font-medium">2023</th>
                  <th className="py-2 text-right font-medium">2024</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">Provider Total Allowed Amount</td>
                  <td className="py-2 text-right">{metric2023 ? formatCurrency(Number(metric2023.total_allowed_amount)) : '-'}</td>
                  <td className="py-2 text-right">{metric2024 ? formatCurrency(Number(metric2024.total_allowed_amount)) : '-'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Provider Percentile Rank</td>
                  <td className="py-2 text-right">{formatPercentile(anomalyFlag.percentile_2023)}</td>
                  <td className="py-2 text-right">{formatPercentile(anomalyFlag.percentile_2024)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Peer Group Size</td>
                  <td className="py-2 text-right" colSpan={2}>{anomalyFlag.peer_group_size} providers</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Peer Group Median</td>
                  <td className="py-2 text-right">{stats2023 ? formatCurrency(stats2023.median) : '-'}</td>
                  <td className="py-2 text-right">{stats2024 ? formatCurrency(stats2024.median) : '-'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">99.5th Percentile Threshold</td>
                  <td className="py-2 text-right">{formatCurrency(Number(anomalyFlag.threshold_2023))}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(anomalyFlag.threshold_2024))}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Methodology Reference */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Methodology</h2>
            <p className="text-sm">
              Peer groups are defined by specialty and state. Percentile rank is calculated 
              using the PERCENT_RANK function on total allowed amounts within each peer group 
              for each calendar year. A provider is flagged only if their percentile rank is 
              at or above 99.5 for both 2023 and 2024. This two-year consistency requirement 
              reduces the likelihood of flagging one-time statistical anomalies.
            </p>
            <p className="mt-2 text-sm">
              <strong>Rule Version:</strong> {anomalyFlag.rule_version} | 
              <strong> Computed:</strong> {new Date(anomalyFlag.computed_at).toLocaleDateString()}
            </p>
          </section>

          {/* Disclaimer */}
          <section className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <h2 className="mb-2 font-semibold">Important Disclaimer</h2>
            <p className="text-sm">
              This report identifies statistical outliers based on publicly available Medicare 
              payment data. A high percentile rank indicates that a provider received more in 
              allowed amounts than most peers in their specialty and state. <strong>This is not 
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
            <p>Confidential - For Authorized Use Only</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
