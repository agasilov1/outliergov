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
            Version 1.0 — Single transparent rule for identifying outliers
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
              A provider is flagged if their metric is above the <Badge className="bg-warning text-warning-foreground">99.5th percentile</Badge> of 
              their peer group for <strong>the required number of consecutive years in the analysis window</strong>.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The consecutive year requirement reduces false positives from one-time anomalies while 
              identifying providers with consistently elevated billing patterns.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">Important Disclaimer</h4>
            <p className="text-sm text-muted-foreground">
              Being flagged as a statistical outlier does not indicate fraud, abuse, or wrongdoing. 
              Many legitimate factors can cause elevated billing, including:
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
