import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
      </div>

      <p className="text-muted-foreground">
        These Terms of Service govern your access to and use of OutlierGov (the "Service"), a free, open-source public accountability tool.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Purpose of the Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The Service provides statistical analyses and visualizations derived from publicly available government datasets. The Service presents descriptive information only.
          </p>
          <p>
            The Service does not make legal, factual, compliance, or investigative determinations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License and Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            You are free to use the Service for any lawful purpose, including but not limited to research, journalism, policy analysis, advocacy, education, and public accountability.
          </p>
          <p>
            We reserve the right to suspend or revoke access in cases of misuse, including defamation, misrepresentation of outputs, or conduct that violates these Terms.
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
            Statistical outliers or anomalies identified by the Service do not indicate wrongdoing, intent, or improper conduct. Results reflect mathematical comparisons within defined peer groups only.
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
            <li>Not misrepresent outputs as factual findings of wrongdoing</li>
            <li>Not use the Service to harass, defame, or target individuals or entities</li>
            <li>Preserve applicable disclaimers when sharing or citing platform outputs</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permitted Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>The Service is designed for broad public use, including:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Academic and independent research</li>
            <li>Journalism and investigative reporting</li>
            <li>Policy analysis and public accountability</li>
            <li>Education and civic engagement</li>
            <li>Comparative statistical analysis</li>
          </ul>
          <p>
            You are encouraged to share, cite, and redistribute outputs. When doing so, please preserve applicable disclaimers so that readers understand the nature and limitations of the data.
          </p>
          <p>
            Please do not present statistical comparisons as findings of wrongdoing, or use outputs as standalone evidence without independent verification.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsible Use of Exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            All exports from the Service — including screenshots, PDFs, downloaded reports, and copied data — should preserve the platform's disclaimers and context.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Users must preserve disclaimers when sharing or citing platform outputs</li>
            <li>Exports should not be modified to misrepresent the nature of the underlying data</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            To ensure fair access for all users, the Service may enforce reasonable rate limits on automated or high-volume requests. If you need bulk access to the underlying data, please contact us.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intellectual Property and Open Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The OutlierGov methodology and codebase are released under the MIT License. You are free to inspect, modify, and redistribute the source code under the terms of that license.
          </p>
          <p>
            The OutlierGov name, logo, and brand identity remain the property of the project maintainers. The underlying public datasets are published by government agencies and are not subject to copyright claims by OutlierGov.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Suspension</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            We reserve the right to suspend access to the Service for misuse, including defamation, misrepresentation of outputs, harassment, or other conduct that violates these Terms.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logging and Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            Access to the Service is logged for security and operational purposes. Logs include authentication events and general usage patterns. Logs may be reviewed in response to suspected misuse or security incidents.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Misuse and Remedies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            In cases of serious misuse — such as unauthorized redistribution with disclaimers removed, defamation, or systematic misrepresentation — we may:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Suspend access without prior notice</li>
            <li>Pursue appropriate legal remedies</li>
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
          <CardTitle>Data Source Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The Service analyzes publicly available datasets released by government agencies. These datasets may contain errors, omissions, or outdated information.
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
          <CardTitle>Indemnification</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            You agree to indemnify and hold OutlierGov and its maintainers harmless from claims arising from your misuse of the Service or violation of these Terms.
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
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of Arizona, without regard to its conflict of law principles.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Any disputes arising from these Terms shall be resolved exclusively in the state or federal courts located in Arizona</li>
            <li>You consent to the personal jurisdiction of such courts</li>
            <li>The prevailing party in any legal action shall be entitled to recover reasonable attorneys' fees and costs</li>
          </ul>
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
