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
            Version 1.3 — Verified extreme outlier identification
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contextual Metrics</CardTitle>
          <CardDescription>
            Supplemental data points for qualifying outlier status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            In addition to the core billing metric, each provider profile includes supplemental data points drawn from the same CMS dataset. These are not part of the inclusion threshold but provide context that may help explain or qualify a provider's outlier status.
          </p>

          <ul className="space-y-4 text-muted-foreground">
            <li>
              <strong>Drug vs. Medical Cost Split</strong> — The percentage of a provider's total allowed amount attributable to Part B drugs (drug_pct). Providers whose billing is predominantly drug-related (e.g., oncology infusion, ophthalmology injection codes) may appear as outliers due to drug acquisition costs rather than service volume or pricing. The dashboard includes a filter to exclude drug-dominant providers (those above 80% drug billing) from the default view.
            </li>
            <li>
              <strong>Beneficiary Average Risk Score</strong> — The CMS Hierarchical Condition Category (HCC) risk score averaged across a provider's patient panel. A higher score indicates a sicker, more complex population, which can legitimately drive higher per-beneficiary spending.
            </li>
            <li>
              <strong>Beneficiary Average Age</strong> — The average age of the provider's Medicare beneficiaries, useful for distinguishing providers who serve disproportionately older or younger panels.
            </li>
            <li>
              <strong>Total HCPCS Codes Billed</strong> — The number of distinct procedure/service codes a provider billed in a given year. A very low count may indicate a narrow, high-cost specialty practice rather than broadly inflated billing.
            </li>
          </ul>

          <p className="text-sm text-muted-foreground">
            These metrics appear on individual provider profiles via a data context card that highlights only the conditions that apply to a given provider (e.g., drug-dominant billing, small patient panel, high-acuity population, narrow procedure set, organizational entity).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Year-Over-Year Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Each provider profile includes a multi-year view of billing trends, showing allowed amount per beneficiary, peer median, and the provider's ratio to median across all available years. This makes it possible to assess whether a provider's outlier status is intensifying, stable, or converging toward peer norms over time.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <h4 className="mb-2 font-medium">Important Disclaimer</h4>
        <p className="text-sm text-muted-foreground">
          Being identified as a statistical outlier does not indicate fraud, abuse, or wrongdoing. 
          This analysis surfaces statistical variance only. Many legitimate factors can cause elevated billing, including:
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Higher patient acuity or complexity</li>
          <li>Drug-dominant billing in specialties where Part B drug costs are a large share of total allowed amounts</li>
          <li>Specialized services not captured in specialty coding</li>
          <li>Geographic factors affecting care delivery</li>
          <li>Teaching hospital status</li>
          <li>Practice size and patient volume</li>
          <li>Organizational (Type 2 NPI) providers that aggregate billing across multiple clinicians</li>
        </ul>
      </div>

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
              Procedure-level breakdown by HCPCS code
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
