import SEOLandingPage from '@/components/SEOLandingPage';

const stats = [
  { value: '4 Stages', label: 'Of Qui Tam Practice Supported' },
  { value: '50 States', label: 'Full National Coverage' },
  { value: 'Public Data', label: 'Transparent & Reproducible' },
];

const faqs = [
  {
    question: 'What is a qui tam case?',
    answer: 'A qui tam case is a lawsuit filed under the False Claims Act by a private individual (the relator or whistleblower) on behalf of the government, alleging that a person or entity has submitted false claims for payment to a government program such as Medicare.',
  },
  {
    question: 'How can billing data support FCA investigations?',
    answer: "Statistical billing analysis can verify whether a provider's billing patterns are anomalous relative to their peers, quantify the magnitude of overbilling, and provide objective evidence to complement whistleblower testimony during DOJ presentations and litigation.",
  },
  {
    question: 'Does OutlierGov prove fraud?',
    answer: 'No. OutlierGov is a statistical screening tool that identifies variance, not wrongdoing. It is designed to complement whistleblower testimony and clinical review, not replace them.',
  },
];

const relatedLinks = [
  { to: '/medicare-billing-outlier-analysis', label: 'Medicare Billing Outlier Analysis' },
  { to: '/healthcare-fraud-data-attorneys', label: 'Healthcare Fraud Data for Attorneys' },
];

export default function QuiTamResearchTools() {
  return (
    <SEOLandingPage
      title="Qui Tam Research Tools | OutlierGov"
      description="Screen and prioritize False Claims Act cases with statistical billing analysis of Medicare providers."
      path="/qui-tam-research-tools"
      stats={stats}
      faqs={faqs}
      relatedLinks={relatedLinks}
    >
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Qui Tam Research and Case Screening
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        OutlierGov helps qui tam attorneys screen and prioritize potential False Claims Act cases involving
        Medicare providers.
      </p>

      <div className="mt-10 space-y-6">
        <div className="rounded-lg border-l-4 border-primary bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Screening Whistleblower Allegations</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Whistleblower allegations often arrive with limited documentation. Before committing investigative
            resources, attorneys need to verify whether a provider's billing patterns are actually anomalous
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
            This data supports several stages of qui tam practice: initial intake screening, identification
            of additional providers exhibiting similar billing patterns, quantification of overbilling
            relative to peers, and preparation of statistical evidence for DOJ presentations.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            OutlierGov is a statistical screening tool. It identifies variance, not wrongdoing. It is designed
            to complement whistleblower testimony and clinical review, not replace them.
          </p>
        </div>
      </div>
    </SEOLandingPage>
  );
}
