import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
          OutlierGov identifies healthcare providers whose Medicare billing consistently 
          falls within the most extreme 0.5% of their specialty and state, across multiple years.
        </p>
      </div>

      {/* Sign In button */}
      <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
        Sign In
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Index;
