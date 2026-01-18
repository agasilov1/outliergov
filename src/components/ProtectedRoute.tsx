import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { TermsAcceptanceModal } from '@/components/TermsAcceptanceModal';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal-versions';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const [checkingExpired, setCheckingExpired] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [checkingTerms, setCheckingTerms] = useState(true);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);

  useEffect(() => {
    async function checkExpiredStatus() {
      if (!user) {
        setCheckingExpired(false);
        return;
      }

      try {
        // Check user's profile for expiration and firm_id
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('expired, firm_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking expired status:', error);
          setCheckingExpired(false);
          return;
        }

        // Check if user is expired
        if (profile?.expired === true) {
          setIsExpired(true);
          setCheckingExpired(false);
          return;
        }

        // Check if user's firm is expired
        if (profile?.firm_id) {
          const { data: firm, error: firmError } = await supabase
            .from('firms')
            .select('expired')
            .eq('id', profile.firm_id)
            .single();

          if (firmError) {
            console.error('Error checking firm expired status:', firmError);
          } else if (firm?.expired === true) {
            setIsExpired(true);
            setCheckingExpired(false);
            return;
          }
        }

        setIsExpired(false);
      } catch (err) {
        console.error('Error checking expired status:', err);
      } finally {
        setCheckingExpired(false);
      }
    }

    if (!loading) {
      checkExpiredStatus();
    }
  }, [user, loading]);

  // Check terms acceptance - separate effect to run after expiry check
  useEffect(() => {
    async function checkTermsAcceptance() {
      // Admin bypass - don't block admins during rollout
      if (!user || isAdmin) {
        setCheckingTerms(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('terms_accepted_version, privacy_accepted_version')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Terms check failed, allowing access:', error);
          // Graceful fallback - don't block on error
          setCheckingTerms(false);
          return;
        }

        const termsOk = profile?.terms_accepted_version === TERMS_VERSION;
        const privacyOk = profile?.privacy_accepted_version === PRIVACY_VERSION;

        setNeedsTermsAcceptance(!termsOk || !privacyOk);
      } catch (err) {
        console.error('Terms check failed, allowing access:', err);
        // Graceful fallback - don't block on error
      } finally {
        setCheckingTerms(false);
      }
    }

    // Only check terms after expiry check is done and user is not expired
    if (!loading && !checkingExpired && !isExpired && user) {
      checkTermsAcceptance();
    } else if (!user || isExpired) {
      setCheckingTerms(false);
    }
  }, [user, loading, isAdmin, checkingExpired, isExpired]);

  if (loading || checkingExpired || checkingTerms) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isExpired) {
    return <Navigate to="/expired" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Show terms acceptance modal if needed (after all other checks pass)
  if (needsTermsAcceptance) {
    return (
      <>
        {children}
        <TermsAcceptanceModal onAccepted={() => setNeedsTermsAcceptance(false)} />
      </>
    );
  }

  return <>{children}</>;
}
