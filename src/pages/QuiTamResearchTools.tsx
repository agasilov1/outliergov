import SEOLandingPage from '@/components/SEOLandingPage';

const stats = [
  { value: '4 Dimensions', label: 'Of Public Accountability Supported' },
  { value: '50 States', label: 'Full National Coverage' },
  { value: 'Public Data', label: 'Transparent & Reproducible' },
];

const faqs = [
  {
    question: 'What kind of research does OutlierGov support?',
    answer: 'OutlierGov supports research into Medicare spending patterns, including journalism, policy analysis, academic study, and public accountability work. It provides statistical screening of provider billing data relative to specialty-state peer groups.',
  },
  {
    question: 'How can billing data support accountability efforts?',
    answer: "Statistical billing analysis can verify whether a provider's billing patterns are anomalous relative to their peers, quantify the magnitude of deviation, and provide objective, reproducible evidence to support further investigation or public reporting.",
  },
  {
    question: 'Does OutlierGov prove fraud or wrongdoing?',
    answer: 'No. OutlierGov is a statistical screening tool that identifies variance, not wrongdoing. It is designed to complement deeper investigation and clinical review, not replace them.',
  },
];

const relatedLinks = [
  { to: '/medicare-billing-outlier-analysis', label: 'Medicare Billing Outlier Analysis' },
  { to: '/provider-registry', label: 'Medicare Outlier Registry' },
];

export default function QuiTamResearchTools() {
  return (
    <SEOLandingPage
      title="Public Accountability Research Tools | OutlierGov"
      description="Screen and analyze Medicare provider billing patterns with transparent, reproducible statistical methods."
      path="/accountability-research-tools"
      stats={stats}
      faqs={faqs}
      relatedLinks={relatedLinks}
    >
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Public Accountability Research Tools
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        OutlierGov is a free, open-source tool that helps researchers, journalists, policymakers, and the
        public screen and analyze Medicare provider billing patterns using transparent, reproducible
        statistical methods.
      </p>

      <div className="mt-10 space-y-6">
        <div className="rounded-lg border-l-4 border-primary bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Screening Provider Billing Patterns</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Many accountability efforts begin with limited information. OutlierGov provides an objective
            starting point by showing whether a provider's billing patterns are statistically anomalous
            relative to their peers, or within normal range.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Each provider in the registry is ranked against their full specialty-state peer group using public
            CMS data. A profile shows the provider's allowed amount per beneficiary, the peer group median,
            the ratio between the two, and a year-over-year trend.
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-primary bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">What Each Provider Profile Includes</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            This data supports multiple dimensions of public accountability: initial screening of billing
            anomalies, identification of similar patterns across providers, quantification of deviation
            relative to peers, and preparation of transparent, reproducible evidence for further review.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            OutlierGov is a statistical screening tool. It identifies variance, not wrongdoing. It is designed
            to complement deeper investigation and expert review, not replace them.
          </p>
        </div>
      </div>
    </SEOLandingPage>
  );
}
