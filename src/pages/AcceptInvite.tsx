import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type InviteStatus = 'loading' | 'success' | 'error';

interface InviteResult {
  success: boolean;
  email?: string;
  role?: string;
  action_link?: string;
  error?: string;
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [message, setMessage] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const acceptInvitation = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No invitation token provided');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite?token=${token}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            }
          }
        );

        const result: InviteResult = await response.json();

        if (!response.ok || !result.success) {
          setStatus('error');
          setMessage(result.error || 'Failed to accept invitation');
          return;
        }

        setStatus('success');
        setMessage(`Welcome! Your account has been created with ${result.role} access.`);

        // If we got an action link, redirect to it
        if (result.action_link) {
          setRedirecting(true);
          toast.success('Account created! Signing you in...');
          
          // Small delay then redirect to the magic link
          setTimeout(() => {
            window.location.href = result.action_link!;
          }, 1500);
        }
      } catch (error) {
        console.error('Error accepting invite:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    acceptInvitation();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground">O</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">OutlierGov</h1>
          <p className="text-sm text-muted-foreground">Healthcare Spending Analytics</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === 'loading' && 'Accepting Invitation...'}
            {status === 'success' && 'Invitation Accepted'}
            {status === 'error' && 'Invitation Error'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we set up your account'}
            {status === 'success' && 'Your account is ready'}
            {status === 'error' && 'There was a problem with your invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center text-muted-foreground">{message}</p>
              {redirecting ? (
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              ) : (
                <Button onClick={() => navigate('/auth')}>
                  Go to Sign In
                </Button>
              )}
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{message}</p>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Go to Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
