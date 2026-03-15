import SEOLandingPage from '@/components/SEOLandingPage';

const stats = [
  { value: '1.2M', label: 'Providers Screened Annually' },
  { value: 'Top 0.5%', label: 'Severity Threshold' },
  { value: '~2,200', label: 'Flagged Providers' },
];

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
  { to: '/accountability-research-tools', label: 'Public Accountability Research Tools' },
  { to: '/provider-registry', label: 'Medicare Outlier Registry' },
];

export default function MedicareBillingOutlierAnalysis() {
  return (
    <SEOLandingPage
      title="Medicare Billing Outlier Analysis | OutlierGov"
      description="Peer-normalized Medicare billing analysis identifying providers in the top 0.5% of their specialty-state peer group across multiple years."
      path="/medicare-billing-outlier-analysis"
      stats={stats}
      faqs={faqs}
      relatedLinks={relatedLinks}
    >
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Medicare Billing Outlier Analysis
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        OutlierGov screens every Medicare Part B provider in the United States against their specialty-state
        peer group to identify persistent statistical outliers.
      </p>

      <div className="mt-10 space-y-6">
        <div className="rounded-lg border-l-4 border-primary bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">How Peer Normalization Works</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            For each of the 1.2 million providers billing Medicare annually, we compute the allowed amount per
            beneficiary and compare it to the full distribution of their peers. A physician assistant in Oklahoma
            is compared only to other physician assistants in Oklahoma.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            A provider is flagged only when their per-beneficiary billing falls in the top 0.5% of their peer
            group and they have sustained that level for at least two consecutive years.
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-primary bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Data Source and Methodology</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            The underlying data comes from the CMS Medicare Physician and Other Practitioners Provider
            Utilization File, a public dataset updated annually. Every calculation can be independently verified.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Each provider profile includes a peer group rank, a ratio showing how many times above the peer
            median they bill, year-over-year trend data, and contextual flags for factors like drug-dominant
            billing, small patient panels, or high-acuity populations.
          </p>
        </div>
      </div>
    </SEOLandingPage>
  );
}
