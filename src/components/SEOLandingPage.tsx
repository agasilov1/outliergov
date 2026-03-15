import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import outlierLogo from '@/assets/OutlierGOV-logo.png';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/medicare-billing-outlier-analysis', label: 'Medicare Billing' },
  { to: '/accountability-research-tools', label: 'Research Tools' },
  { to: '/provider-registry', label: 'Provider Registry' },
];

interface FAQItem {
  question: string;
  answer: string;
}

interface StatItem {
  value: string;
  label: string;
}

interface SEOLandingPageProps {
  children: ReactNode;
  title: string;
  description: string;
  path: string;
  heroDescription?: string;
  stats?: StatItem[];
  faqs?: FAQItem[];
  relatedLinks: { to: string; label: string }[];
}

export default function SEOLandingPage({ children, title, description, path, heroDescription, stats, faqs, relatedLinks }: SEOLandingPageProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin + path;

    let faqScript: HTMLScriptElement | null = null;
    if (faqs?.length) {
      faqScript = document.createElement('script');
      faqScript.type = 'application/ld+json';
      faqScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
      document.head.appendChild(faqScript);
    }

    return () => {
      if (faqScript) document.head.removeChild(faqScript);
      if (canonical) canonical.remove();
    };
  }, [title, description, path, faqs]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={outlierLogo} alt="OutlierGov logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-lg font-bold text-foreground">OutlierGov</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground ${
                  link.to === path
                    ? 'bg-accent font-semibold text-accent-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <article className="max-w-3xl">
            {children}
          </article>
          {heroDescription && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {heroDescription}
            </p>
          )}
        </div>
      </section>

      {/* Stats */}
      {stats?.length ? (
        <section className="border-b">
          <div className="mx-auto grid max-w-5xl gap-px bg-border sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div key={i} className="bg-background px-6 py-8 text-center">
                <div className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* CTA Band */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6">
          <h2 className="text-xl font-semibold text-foreground">Ready to explore the data?</h2>
          <Button size="lg" variant="default" asChild className="gap-2">
            <a href="mailto:arif@outliergov.com?subject=OutlierGov%20Access%20Request">
              <Mail className="h-4 w-4" />
              Request Access
            </a>
          </Button>
          <p className="text-sm text-muted-foreground">
            Contact: <a href="mailto:arif@outliergov.com" className="underline hover:text-foreground">arif@outliergov.com</a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      {faqs?.length ? (
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      ) : null}

      {/* Related */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Related</h2>
          <div className="flex flex-wrap gap-3">
            {relatedLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>© OutlierGov</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
