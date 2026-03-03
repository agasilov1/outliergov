import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import outlierLogo from '@/assets/OutlierGOV-logo.png';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/medicare-billing-outlier-analysis', label: 'Medicare Billing' },
  { to: '/qui-tam-research-tools', label: 'Qui Tam Tools' },
  { to: '/healthcare-fraud-data-attorneys', label: 'Fraud Data' },
];

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOLandingPageProps {
  children: ReactNode;
  title: string;
  description: string;
  path: string;
  faqs?: FAQItem[];
  relatedLinks: { to: string; label: string }[];
}

export default function SEOLandingPage({ children, title, description, path, faqs, relatedLinks }: SEOLandingPageProps) {
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
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <header className="mb-6">
        <Link to="/" className="mb-4 flex items-center gap-3">
          <img src={outlierLogo} alt="OutlierGov logo" className="h-10 w-10 rounded-lg object-contain" />
          <span className="text-xl font-bold text-foreground">OutlierGov</span>
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-foreground ${link.to === path ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        {children}
      </article>

      {/* CTA */}
      <div className="mt-12 flex flex-col items-start gap-3">
        <Button size="lg" variant="outline" asChild className="gap-2">
          <a href="mailto:arif@gasilov.com?subject=OutlierGov%20Access%20Request">
            <Mail className="h-4 w-4" />
            Request Access
          </a>
        </Button>
        <p className="text-sm text-muted-foreground">
          Contact: <a href="mailto:arif@gasilov.com" className="underline hover:text-foreground">arif@gasilov.com</a>
        </p>
      </div>

      {/* FAQ */}
      {faqs?.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="font-medium text-foreground">{faq.question}</h3>
                <p className="mt-1 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Related */}
      <nav className="mt-12 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Related</h2>
        <ul className="space-y-2">
          {relatedLinks.map(link => (
            <li key={link.to}>
              <Link to={link.to} className="text-primary underline hover:text-primary/80">{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <footer className="mt-8 border-t pt-6 flex gap-4 text-sm text-muted-foreground">
        <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
        <span>•</span>
        <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
      </footer>
    </div>
  );
}
