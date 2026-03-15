import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2, Search, Scale, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import outlierLogo from '@/assets/OutlierGOV-logo.png';

const navCards = [
  {
    to: '/medicare-billing-outlier-analysis',
    title: 'Medicare Billing Outlier Analysis',
    desc: 'Peer-normalized screening of every Medicare Part B provider.',
    icon: Search,
  },
  {
    to: '/accountability-research-tools',
    title: 'Public Accountability Research',
    desc: 'Tools for researchers, journalists, and policymakers.',
    icon: Scale,
  },
  {
    to: '/provider-registry',
    title: 'Medicare Outlier Registry',
    desc: 'Searchable registry of Medicare billing outliers.',
    icon: FileText,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'OutlierGov',
      url: window.location.origin,
      logo: window.location.origin + '/assets/OutlierGOV-logo.png',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'arif@outliergov.com',
        contactType: 'customer service',
      },
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-10 pt-20 text-center sm:pt-28">
          <div className="mb-8 flex items-center gap-3">
            <img src={outlierLogo} alt="OutlierGov logo" className="h-14 w-14 rounded-xl object-contain" />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground">OutlierGov</h1>
              <p className="text-sm text-muted-foreground">Healthcare Spending Analytics</p>
            </div>
          </div>
          <p className="max-w-2xl text-xl leading-relaxed text-muted-foreground">
            OutlierGov is a free, open-source public accountability tool that identifies Medicare providers
            whose allowed amount per beneficiary is persistently extreme (top 0.5%) relative to specialty
            and state peers, across multiple years.
          </p>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="mx-auto -mt-1 max-w-4xl px-4 pb-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {navCards.map(card => (
            <Link
              key={card.to}
              to={card.to}
              className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <card.icon className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">{card.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-12">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => navigate('/dashboard')} className="gap-2">
            Explore the Registry
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Contact: <a href="mailto:arif@outliergov.com" className="underline hover:text-foreground">arif@outliergov.com</a>
        </p>
      </section>

      {/* About */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-3">About OutlierGov</h2>
          <p className="text-muted-foreground leading-relaxed">
            OutlierGov was built to make Medicare spending data accessible and understandable. Using publicly
            available CMS datasets, it applies peer-normalized statistical analysis to surface billing
            anomalies — giving researchers, journalists, policymakers, and the public a transparent,
            reproducible tool for public accountability. The methodology and codebase are open source.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-4 px-4 py-6 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
