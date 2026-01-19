import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Methodology() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
        <p className="text-muted-foreground">
          How providers are verified for inclusion in the outlier registry
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anomaly Detection Rule</CardTitle>
          <CardDescription>
            Version 1.2 — Verified extreme outlier identification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 font-semibold">Peer Group Definition</h3>
            <p className="text-muted-foreground">
              Providers are grouped by <Badge variant="outline">specialty</Badge> + <Badge variant="outline">state</Badge>. 
              This ensures fair comparison between providers offering similar services in the same geographic market.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Metric</h3>
            <p className="text-muted-foreground">
              We analyze <strong>Medicare allowed amount per beneficiary per year</strong> (total allowed divided by 
              total beneficiaries). This per-capita metric normalizes for patient volume. Peer median is the median 
              allowed-per-beneficiary within the specialty-state peer group for that year. Total allowed amount is 
              also displayed for volume context.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Inclusion Threshold</h3>
            <p className="text-muted-foreground">
              A provider is included in this registry if their allowed amount per beneficiary ranked within the <Badge className="bg-destructive text-destructive-foreground">Top 0.5% (≥99.5th percentile)</Badge> of 
              their specialty-state peer group for <strong>2 consecutive years</strong> within the analysis window.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The consecutive-year requirement reduces noise from one-time billing spikes and focuses on 
              providers with sustained extreme billing patterns.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Verification Approach</h3>
            <p className="text-muted-foreground">
              All providers displayed were identified during offline analysis that applied minimum statistical 
              validity thresholds prior to inclusion. This registry represents a curated set of verified extreme 
              outliers rather than a full percentile distribution.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Rankings are by multiples above the peer median (per-beneficiary allowed amount), not by percentile rank.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>Note on Suppression:</strong> Rows with suppressed or missing beneficiary counts (per CMS cell-size 
              suppression rules) cannot be evaluated on a per-beneficiary basis and are excluded from verification. This 
              ensures statistical validity but may exclude some providers from the registry.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <h4 className="mb-2 font-medium">Important Disclaimer</h4>
            <p className="text-sm text-muted-foreground">
              Being identified as a statistical outlier does not indicate fraud, abuse, or wrongdoing. 
              This analysis surfaces statistical variance only. Many legitimate factors can cause elevated billing, including:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              <li>Higher patient acuity or complexity</li>
              <li>Specialized services not captured in specialty coding</li>
              <li>Geographic factors affecting care delivery</li>
              <li>Teaching hospital status</li>
              <li>Practice size and patient volume</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Public datasets used for analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This platform analyzes <strong>CMS Medicare Part B Provider Utilization and Payment Data</strong>, 
            which is publicly available from the Centers for Medicare & Medicaid Services (CMS). 
            This dataset contains information about services and procedures provided to Medicare beneficiaries 
            by physicians and other healthcare professionals.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Future Enhancements</CardTitle>
          <CardDescription>
            Planned improvements for subsequent versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Additional peer group dimensions (practice type, patient demographics)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Multiple anomaly detection algorithms
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Year-over-year trend analysis
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Procedure-level breakdown
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
