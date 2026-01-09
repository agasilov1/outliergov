import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

type InviteStatus = 'loading' | 'success' | 'error';

interface InviteResult {
  success: boolean;
  email?: string;
  role?: string;
  action_link?: string;
  email_sent?: boolean;
  error?: string;
  message?: string;
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
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
        setEmail(result.email || '');

        // If we got an action link (existing user), redirect to it
        if (result.action_link) {
          setRedirecting(true);
          setMessage('User already exists. Signing you in...');
          toast.success('Signing you in...');
          
          setTimeout(() => {
            window.location.href = result.action_link!;
          }, 1500);
        } else if (result.email_sent) {
          // New user - email sent for password setup
          setMessage(result.message || 'Check your email to set your password and complete signup.');
          toast.success('Check your email!');
        } else {
          setMessage(`Welcome! Your account has been created with ${result.role} access.`);
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
            {status === 'success' && (redirecting ? 'Signing you in...' : 'Check your email to complete setup')}
            {status === 'error' && 'There was a problem with your invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          
          {status === 'success' && (
            <>
              {redirecting ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">{message}</p>
                    {email && (
                      <p className="font-medium">
                        Email sent to: <span className="text-primary">{email}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Didn't receive the email? Check your spam folder or contact support.</p>
                  </div>
                </>
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
