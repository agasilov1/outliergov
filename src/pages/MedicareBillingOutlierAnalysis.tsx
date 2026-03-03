import SEOLandingPage from '@/components/SEOLandingPage';

const faqs = [
  {
    question: 'What is a Medicare billing outlier?',
    answer: 'A Medicare billing outlier is a provider whose allowed amount per beneficiary falls in the top 0.5% of their specialty-state peer group for at least two consecutive years, indicating persistently extreme billing relative to peers.',
  },
  {
    question: 'How are peer groups defined?',
    answer: 'Peer groups are defined by specialty and state. A cardiologist in Texas is compared only to other cardiologists in Texas, ensuring that comparisons account for regional cost differences and specialty-specific billing patterns.',
  },
  {
    question: 'Why require two consecutive years?',
    answer: 'A single year of elevated billing can result from unusual case mix, coding changes, or one-time events. Requiring persistence across two or more years filters out transient spikes and surfaces providers with sustained anomalies.',
  },
];

const relatedLinks = [
  { to: '/qui-tam-research-tools', label: 'Qui Tam Research and Case Screening' },
  { to: '/healthcare-fraud-data-attorneys', label: 'Healthcare Fraud Data for Attorneys' },
];

export default function MedicareBillingOutlierAnalysis() {
  return (
    <SEOLandingPage
      title="Medicare Billing Outlier Analysis | OutlierGov"
      description="Peer-normalized Medicare billing analysis identifying providers in the top 0.5% of their specialty-state peer group across multiple years."
      path="/medicare-billing-outlier-analysis"
      faqs={faqs}
      relatedLinks={relatedLinks}
    >
      <h1>Medicare Billing Outlier Analysis</h1>

      <p>
        OutlierGov screens every Medicare Part B provider in the United States against their specialty-state
        peer group to identify persistent statistical outliers.
      </p>
      <p>
        For each of the 1.2 million providers billing Medicare annually, we compute the allowed amount per
        beneficiary and compare it to the full distribution of their peers. A physician assistant in Oklahoma
        is compared only to other physician assistants in Oklahoma. A podiatrist in Maryland is compared only
        to other podiatrists in Maryland.
      </p>

      <h2>How Peer Normalization Works</h2>
      <p>
        A provider is flagged only when two conditions are met: their per-beneficiary billing falls in the
        top 0.5% of their peer group, and they have sustained that level for at least two consecutive years.
        One-year spikes from unusual case mix or coding changes are filtered out. What remains is a registry
        of approximately 2,200 providers whose billing is persistently and significantly above their peers.
      </p>
      <p>
        Each provider profile includes a peer group rank, a ratio showing how many times above the peer
        median they bill, year-over-year trend data, and contextual flags for factors like drug-dominant
        billing, small patient panels, or high-acuity populations.
      </p>

      <h2>Data Source and Methodology</h2>
      <p>
        The underlying data comes from the CMS Medicare Physician and Other Practitioners Provider
        Utilization File, a public dataset updated annually. Every calculation can be independently verified.
      </p>
    </SEOLandingPage>
  );
}
