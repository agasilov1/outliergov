import SEOLandingPage from '@/components/SEOLandingPage';

const faqs = [
  {
    question: 'What data does OutlierGov use?',
    answer: 'OutlierGov uses the CMS Medicare Part B Provider Utilization File, a public dataset updated annually that covers approximately 3.7 million provider-year records across 2021 through 2023.',
  },
  {
    question: 'Can the analysis withstand Rule 9(b) scrutiny?',
    answer: 'All metrics are transparent and reproducible. The peer group for any flagged provider can be independently verified using the same public CMS dataset. The methodology is designed to support the specificity requirements of Rule 9(b) pleading standards.',
  },
  {
    question: 'How many providers are in the registry?',
    answer: 'Approximately 2,200 providers meet both the severity threshold (top 0.5% of peer group) and duration threshold (at least two consecutive years), out of roughly 1.2 million providers billing Medicare Part B annually.',
  },
];

const relatedLinks = [
  { to: '/medicare-billing-outlier-analysis', label: 'Medicare Billing Outlier Analysis' },
  { to: '/qui-tam-research-tools', label: 'Qui Tam Research and Case Screening' },
];

export default function HealthcareFraudDataAttorneys() {
  return (
    <SEOLandingPage
      title="Healthcare Fraud Data for Attorneys | OutlierGov"
      description="Searchable registry of Medicare billing outliers for qui tam attorneys and FCA investigators."
      path="/healthcare-fraud-data-attorneys"
      faqs={faqs}
      relatedLinks={relatedLinks}
    >
      <h1>Healthcare Fraud Data for Attorneys</h1>

      <p>
        OutlierGov gives attorneys access to a structured, searchable registry of Medicare providers whose
        billing patterns are statistical outliers relative to their specialty and state peers.
      </p>

      <h2>What the Registry Covers</h2>
      <p>
        The registry covers all 50 states and all Medicare Part B specialties. Providers can be filtered by
        specialty, state, peer group size, outlier severity, billing trend direction, and drug percentage.
        Each provider profile is exportable as a PDF containing the statistical summary, peer group snapshot,
        per-year breakdown, and comparison charts.
      </p>
      <p>
        The data source is the CMS Medicare Part B Provider Utilization File, which is public and updated
        annually. OutlierGov processes approximately 3.7 million provider-year records across 2021 through
        2023, applies peer normalization and persistence filters, and surfaces the roughly 2,200 providers
        who meet both the severity and duration thresholds.
      </p>

      <h2>Transparency and Reproducibility</h2>
      <p>
        All metrics are transparent and reproducible. The peer group for any flagged provider can be
        independently verified using the same public CMS dataset. This matters for qui tam cases where the
        reliability of analytical methods may be scrutinized under Rule 9(b) pleading standards.
      </p>
    </SEOLandingPage>
  );
}
