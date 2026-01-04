import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Methodology() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
        <p className="text-muted-foreground">
          How we identify statistical outliers in healthcare spending data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anomaly Detection Rule</CardTitle>
          <CardDescription>
            Version 1.1 — Two-tier classification system for identifying statistical outliers
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
              We analyze <strong>total allowed amount per year</strong> — the sum of what Medicare approved for payment 
              to each provider. This metric captures both the volume and intensity of services billed.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Flagging Threshold</h3>
            <p className="text-muted-foreground">
              A provider is flagged if their metric is at or above the <Badge className="bg-destructive text-destructive-foreground">99.0th percentile</Badge> of 
              their peer group for <strong>2 consecutive years</strong> in the analysis window.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The consecutive year requirement reduces false positives from one-time anomalies while 
              identifying providers with consistently elevated billing patterns.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-3 font-medium">Two-Tier Classification System</h4>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <Badge variant="destructive" className="shrink-0 mt-0.5">High Confidence</Badge>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Criteria:</strong> ≥99.0th percentile for 2 consecutive years, with peer group size ≥20 providers.</p>
                  <p className="mt-1">These are statistically robust findings suitable for detailed review and investigation.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 mt-0.5 text-amber-600 border-amber-600">Low Confidence</Badge>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Criteria:</strong> ≥99.0th percentile for 2 consecutive years, but peer group size &lt;20 providers.</p>
                  <p className="mt-1">These are investigative leads only. Small peer group sizes limit statistical significance and require additional verification before drawing any conclusions.</p>
                </div>
              </div>
            </div>
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
