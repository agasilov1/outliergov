import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
      </div>

      <p className="text-muted-foreground">
        This Privacy Policy describes how we collect, use, and protect information when you access or use this application (the "Service").
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            We collect limited information necessary to operate and secure the Service, including:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Account information such as email address and authentication metadata</li>
            <li>Technical information such as IP address, browser type, and device identifiers</li>
            <li>Usage data related to interaction with the Service for reliability and audit purposes</li>
          </ul>
          <p>
            We do not knowingly collect sensitive personal data beyond what is required for authentication and basic operation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How We Use Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>Information is used solely to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Authenticate users and manage access</li>
            <li>Operate, maintain, and improve the Service</li>
            <li>Monitor system integrity and performance</li>
            <li>Comply with legal obligations</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources and Analysis</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            The Service may display analyses derived from public or licensed datasets. These datasets do not originate from user submissions and are processed independently of user account data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Sharing</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            We may share information with trusted service providers that support hosting, authentication, and infrastructure. We do not sell personal information.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            Information is retained only as long as necessary to operate the Service, comply with legal requirements, and maintain auditability.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            We implement reasonable technical and organizational safeguards designed to protect information from unauthorized access or misuse. No system can guarantee absolute security.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Choices</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            You may request access, correction, or deletion of your account information by contacting us.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>If you have questions about this Privacy Policy, contact us at:</p>
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
