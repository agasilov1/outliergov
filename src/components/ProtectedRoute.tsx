import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const [checkingExpired, setCheckingExpired] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

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

  if (loading || checkingExpired) {
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

  return <>{children}</>;
}
