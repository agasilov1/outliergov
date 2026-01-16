import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

export default function DataSources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
        <p className="text-muted-foreground">
          Public datasets powering the verified outlier registry
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Medicare Provider Utilization and Payment Data
            <Badge variant="secondary">Primary Source</Badge>
          </CardTitle>
          <CardDescription>
            Centers for Medicare & Medicaid Services (CMS)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The Medicare Provider Utilization and Payment Data contains information on services 
            and procedures provided to Medicare beneficiaries by physicians and other healthcare 
            professionals. The data includes:
          </p>

          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Provider National Provider Identifier (NPI)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Provider name, credentials, and specialty
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Practice location (state, city, ZIP)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Total services, beneficiaries, and allowed amounts
            </li>
          </ul>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">Data Refresh</h4>
            <p className="text-sm text-muted-foreground">
              CMS typically releases this data annually, with a 1-2 year lag. 
              Our analysis covers the years included in the active dataset release.
            </p>
          </div>

          <a
            href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-physician-other-practitioners"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            View on data.cms.gov
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Processing</CardTitle>
          <CardDescription>
            How we prepare the data for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-medium">Aggregation</h4>
            <p className="text-sm text-muted-foreground">
              Provider-level data is aggregated by NPI, summing total allowed amounts 
              across all procedures for each calendar year.
            </p>
          </div>

          <div>
            <h4 className="mb-2 font-medium">Peer Group Assignment</h4>
            <p className="text-sm text-muted-foreground">
              Each provider is assigned to a peer group based on their primary specialty 
              code and the state where they practice.
            </p>
          </div>

          <div>
            <h4 className="mb-2 font-medium">Outlier Identification</h4>
            <p className="text-sm text-muted-foreground">
              During offline analysis, percentile ranks are computed within each peer group 
              to identify extreme outliers. Providers within the top 0.5% (≥99.5th percentile) 
              for two consecutive years are included in the verified outlier registry.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
