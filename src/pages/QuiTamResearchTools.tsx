import SEOLandingPage from '@/components/SEOLandingPage';

const faqs = [
  {
    question: 'What is a qui tam case?',
    answer: 'A qui tam case is a lawsuit filed under the False Claims Act by a private individual (the relator or whistleblower) on behalf of the government, alleging that a person or entity has submitted false claims for payment to a government program such as Medicare.',
  },
  {
    question: 'How can billing data support FCA investigations?',
    answer: 'Statistical billing analysis can verify whether a provider\'s billing patterns are anomalous relative to their peers, quantify the magnitude of overbilling, and provide objective evidence to complement whistleblower testimony during DOJ presentations and litigation.',
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
      faqs={faqs}
      relatedLinks={relatedLinks}
    >
      <h1>Qui Tam Research and Case Screening</h1>

      <p>
        OutlierGov helps qui tam attorneys screen and prioritize potential False Claims Act cases involving
        Medicare providers.
      </p>
      <p>
        Whistleblower allegations often arrive with limited documentation. Before committing investigative
        resources, attorneys need to verify whether a provider's billing patterns are actually anomalous
        relative to their peers, or within normal range.
      </p>

      <h2>Screening Whistleblower Allegations</h2>
      <p>
        OutlierGov provides that verification. Each provider in the registry is ranked against their full
        specialty-state peer group using public CMS data. A profile shows the provider's allowed amount per
        beneficiary, the peer group median, the ratio between the two, and a year-over-year trend showing
        whether the anomaly is growing, stable, or declining.
      </p>

      <h2>What Each Provider Profile Includes</h2>
      <p>
        This data supports several stages of qui tam practice: initial intake screening to determine if a
        whistleblower's target shows statistical anomalies, identification of additional providers exhibiting
        similar billing patterns, quantification of the magnitude of overbilling relative to peers, and
        preparation of statistical evidence for DOJ presentations.
      </p>
      <p>
        OutlierGov is a statistical screening tool. It identifies variance, not wrongdoing. It is designed
        to complement whistleblower testimony and clinical review, not replace them.
      </p>
    </SEOLandingPage>
  );
}
