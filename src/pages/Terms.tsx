import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
        <p className="text-muted-foreground">Last updated: March 15, 2026</p>
      </div>

      <p className="text-muted-foreground">
        These Terms of Use govern your access to and use of OutlierGov ("the Service").
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Purpose of the Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            OutlierGov is a free, open-source public accountability tool that provides statistical analyses and visualizations derived from publicly available Medicare billing data. The Service presents descriptive statistical information only.
          </p>
          <p>
            The Service does not make legal, factual, compliance, or investigative determinations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Access</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            OutlierGov is available to the public at no cost. You may use the Service for research, journalism, policy analysis, public accountability, education, or any other lawful purpose.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>No Legal or Professional Advice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            Information provided through the Service is for informational and research purposes only. It does not constitute legal, financial, medical, or compliance advice.
          </p>
          <p>
            You are solely responsible for how you interpret and use any information provided.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>No Allegations or Conclusions</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            Statistical outliers or anomalies identified by the Service do not indicate wrongdoing, fraud, intent, or improper conduct. Results reflect mathematical comparisons within defined peer groups only.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>You agree to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use the Service lawfully</li>
            <li>Not misrepresent statistical outputs as findings of wrongdoing</li>
            <li>Not use the Service to harass, defame, or target individuals or entities</li>
            <li>Preserve disclaimers when citing, sharing, or republishing outputs from the Service</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sharing and Redistribution</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            You are encouraged to share, cite, and build upon outputs from the Service. When doing so, you must preserve the disclaimer that statistical outlier status does not indicate fraud, illegality, or improper conduct.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Source</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            The OutlierGov methodology and codebase are released under an open-source license. See our GitHub repository for license details, source code, and documentation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intellectual Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The OutlierGov platform, methodology, and original code are released under open-source terms. The underlying Medicare billing data is public domain, published by the Centers for Medicare and Medicaid Services (CMS). OutlierGov does not claim ownership over public government data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Source Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The Service analyzes publicly available datasets released by the Centers for Medicare and Medicaid Services (CMS). These datasets may contain errors, omissions, or outdated information.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>We do not guarantee the accuracy, completeness, or timeliness of source data</li>
            <li>Provider information reflects source data as published and may not reflect current status</li>
            <li>Data processing may introduce additional limitations not present in source datasets</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disclaimer of Warranties</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            The Service is provided "as is" and "as available." We make no warranties regarding accuracy, completeness, or fitness for a particular purpose.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            To the maximum extent permitted by law, OutlierGov and its maintainers shall not be liable for indirect, incidental, or consequential damages arising from use of the Service.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            We may update these Terms from time to time. Continued use of the Service constitutes acceptance of updated Terms.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Governing Law</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of Arizona.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Questions regarding these Terms may be directed to:</p>
          <p className="mt-2">
            <a
              href="mailto:arif@outliergov.com"
              className="text-primary underline hover:text-primary/80"
            >
              arif@outliergov.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
