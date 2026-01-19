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
        These Terms of Service govern your access to and use of this application (the "Service").
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Purpose of the Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The Service provides statistical analyses and visualizations derived from structured datasets. The Service presents descriptive information only.
          </p>
          <p>
            The Service does not make legal, factual, compliance, or investigative determinations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your organization's internal purposes.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>You may not sublicense, assign, or transfer your access rights to any third party</li>
            <li>Access is granted only to authorized personnel within your organization</li>
            <li>This license may be revoked at any time for violation of these Terms</li>
          </ul>
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
            <li>Not misrepresent outputs as factual findings</li>
            <li>Not use the Service to harass, defame, or target individuals or entities</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confidentiality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            All outputs, analyses, and information provided through the Service are confidential to your organization.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>You may not share outputs with third parties without prior written consent from the Company</li>
            <li>Internal distribution within your organization must preserve all applicable disclaimers</li>
            <li>Outputs may not be used in public filings, press releases, or external communications without authorization</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permitted Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>Your access to the Service is granted solely for:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Internal screening and research purposes</li>
            <li>Due diligence and case intake evaluation</li>
            <li>Comparative statistical analysis</li>
          </ul>
          <p className="font-medium text-foreground">You may NOT:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Bulk export, scrape, or systematically download data from the Service</li>
            <li>Publicly redistribute outputs in any format (reports, datasets, summaries)</li>
            <li>Share outputs externally without preserving all applicable disclaimers</li>
            <li>Use outputs as standalone evidence without independent verification</li>
            <li>Present statistical comparisons as findings of wrongdoing</li>
          </ul>
          <p>
            All outputs must retain the platform's disclaimers when shared internally or used in any documentation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restrictions on Use</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            You may not publicly represent, publish, or redistribute outputs from the Service in a manner that implies factual findings, legal conclusions, or determinations of wrongdoing. Any external use must preserve appropriate disclaimers and context.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            All exports from the Service, including but not limited to screenshots, PDFs, downloaded reports, and copied data, are subject to the same restrictions as on-platform usage.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>All exports must retain the platform's disclaimers and context</li>
            <li>Removal, alteration, or obscuring of disclaimers constitutes a material breach of these Terms</li>
            <li>Exports may not be modified to misrepresent the nature of the underlying data</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intellectual Property</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            All content, software, and materials provided through the Service are owned by the Company or its licensors and are protected by applicable intellectual property laws.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Suspension and Termination</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            We reserve the right to suspend or terminate access to the Service at any time for violations of these Terms, misuse of outputs, or security reasons.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit and Logging Notice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            All access to and use of the Service is logged for security, compliance, and audit purposes.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Logs include authentication events, data access patterns, and export activities</li>
            <li>Logs may be reviewed in response to suspected misuse or security incidents</li>
            <li>Audit logs are retained for a minimum of two (2) years</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Immediate Remedies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The Company reserves the right to take immediate action in response to violations of these Terms, including but not limited to:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Immediate suspension of access without prior notice for suspected misuse</li>
            <li>Pursuit of legal remedies for unauthorized redistribution, defamation, or misrepresentation</li>
            <li>Termination of accounts with no refund for any prepaid services</li>
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
            The Service analyzes publicly available datasets released by government agencies and other public sources. These datasets may contain errors, omissions, or outdated information.
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
            To the maximum extent permitted by law, the Company shall not be liable for indirect, incidental, or consequential damages arising from use of the Service.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indemnification</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            You agree to indemnify and hold the Company harmless from claims arising from your misuse of the Service or violation of these Terms.
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
              href="mailto:info@gasilov.com"
              className="text-primary underline hover:text-primary/80"
            >
              info@gasilov.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
