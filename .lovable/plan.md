

## Plan: Create 3 SEO Landing Pages

### Overview
Create three public SEO landing pages with proper meta tags, H2 structure, internal cross-linking, FAQ sections with schema markup, and Organization schema on the main page. All pages are public (no auth required).

### New Files

**1. `src/components/SEOLandingPage.tsx`** — Shared layout component
- Logo header with link back to `/`
- Renders children (page-specific content)
- "Request Access" CTA button (mailto:arif@gasilov.com)
- Contact line
- "Related" section with internal links to the other two SEO pages
- Legal footer links (Privacy, Terms)
- Uses `useEffect` to set `document.title` and meta description + canonical tag dynamically
- Injects JSON-LD FAQ schema into `<head>` via `useEffect`
- Minimal styling — text-focused, no unnecessary JS

**2. `src/pages/MedicareBillingOutlierAnalysis.tsx`**
- Route: `/medicare-billing-outlier-analysis`
- Title: "Medicare Billing Outlier Analysis | OutlierGov"
- Meta description: "Peer-normalized Medicare billing analysis identifying providers in the top 0.5% of their specialty-state peer group across multiple years."
- H1: Medicare Billing Outlier Analysis
- H2s: "How Peer Normalization Works", "Data Source and Methodology"
- Body text split across the H2 sections
- 2-3 FAQ items at bottom (e.g., "What is a Medicare billing outlier?", "How are peer groups defined?")
- FAQ JSON-LD schema
- Related links to the other two pages

**3. `src/pages/QuiTamResearchTools.tsx`**
- Route: `/qui-tam-research-tools`
- Title: "Qui Tam Research Tools | OutlierGov"
- Meta description: "Screen and prioritize False Claims Act cases with statistical billing analysis of Medicare providers."
- H1: Qui Tam Research and Case Screening
- H2s: "Screening Whistleblower Allegations", "What Each Provider Profile Includes"
- 2-3 FAQ items (e.g., "What is a qui tam case?", "How can billing data support FCA investigations?")
- Related links

**4. `src/pages/HealthcareFraudDataAttorneys.tsx`**
- Route: `/healthcare-fraud-data-attorneys`
- Title: "Healthcare Fraud Data for Attorneys | OutlierGov"
- Meta description: "Searchable registry of Medicare billing outliers for qui tam attorneys and FCA investigators."
- H1: Healthcare Fraud Data for Attorneys
- H2s: "What the Registry Covers", "Transparency and Reproducibility"
- 2-3 FAQ items (e.g., "What data does OutlierGov use?", "Can the analysis withstand Rule 9(b) scrutiny?")
- Related links

### Modified Files

**5. `src/App.tsx`**
- Import the 3 new page components
- Add 3 public routes (no `ProtectedRoute` wrapper) before the catch-all:
  - `/medicare-billing-outlier-analysis`
  - `/qui-tam-research-tools`
  - `/healthcare-fraud-data-attorneys`

**6. `src/pages/Index.tsx`**
- Add Organization JSON-LD schema via `useEffect` (name: OutlierGov, url, logo, contactPoint)

### Technical Details

- **Meta tags**: Each page sets `document.title`, and creates/updates `<meta name="description">`, `<link rel="canonical">` in `useEffect` with cleanup
- **Schema markup**: Organization schema on Index, FAQPage schema on each landing page — injected as `<script type="application/ld+json">` via `useEffect`
- **Internal linking**: Each page has a "Related" section at the bottom linking to the other two SEO pages
- **Performance**: Pages are static content with minimal state — just `useEffect` for meta tags. No data fetching, no heavy components
- **Canonical tags**: Self-referencing canonical on each page using `window.location.origin + path`

