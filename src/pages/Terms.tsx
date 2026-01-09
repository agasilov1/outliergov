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
        <CardContent className="text-muted-foreground">
          <p>
            These Terms are governed by the laws of the applicable jurisdiction.
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
