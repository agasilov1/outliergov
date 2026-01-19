import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
          <span className="text-3xl font-bold text-primary-foreground">O</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">OutlierGov</h1>
          <p className="text-sm text-muted-foreground">Healthcare Spending Analytics</p>
        </div>
      </div>

      {/* Main statement */}
      <div className="max-w-2xl text-center mb-8">
        <p className="text-xl text-muted-foreground leading-relaxed">
          OutlierGov identifies providers whose Medicare allowed amount per beneficiary 
          is persistently extreme (top 0.5%) relative to specialty and state peers, across multiple years.
        </p>
      </div>

      {/* Sign In button */}
      <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
        Sign In
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Contact */}
      <a 
        href="mailto:info@gasilov.com" 
        className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
      >
        Contact: info@gasilov.com
      </a>

      {/* Legal links */}
      <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
        <Link to="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        <span>•</span>
        <Link to="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>
      </div>
    </div>
  );
};

export default Index;
