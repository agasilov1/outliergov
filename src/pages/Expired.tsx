import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Mail } from 'lucide-react';

export default function Expired() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground">O</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">OutlierGov</h1>
          <p className="text-sm text-muted-foreground">Healthcare Spending Analytics</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-amber-500/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle>Account Access Expired</CardTitle>
          <CardDescription>
            Your access to OutlierGov has expired
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Please contact us to renew your subscription and regain access to the platform.
          </p>
          
          <div className="rounded-lg border bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Contact us at:</span>
            </div>
            <a 
              href="mailto:info@gasilov.com" 
              className="text-primary font-medium hover:underline"
            >
              info@gasilov.com
            </a>
          </div>

          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="w-full"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
