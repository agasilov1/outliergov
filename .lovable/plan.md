

## Plan: Mozilla-Ready Rewrite — Terms, Privacy, SEO Pages, Navigation, and Homepage

This is a comprehensive rewrite touching 10+ files to reframe OutlierGov from a gated attorney SaaS to a free, open public accountability tool.

---

### 1. Terms of Service (`src/pages/Terms.tsx`) — Full Rewrite

- **License Scope**: Rewrite to allow any lawful use (research, journalism, advocacy, education, public accountability). Remove sublicensing restriction, "authorized personnel" line, and "organization" framing. Keep revocation for misuse (defamation, misrepresentation).
- **Delete Confidentiality section entirely**
- **Permitted Use**: Replace attorney-specific language (due diligence, case intake) with broad categories. Remove bulk export/scrape restriction (replace with rate-limit notice). Remove redistribution restriction. Keep disclaimer-preservation requirement but drop "externally" framing.
- **Export Restrictions**: Rename to "Responsible Use of Exports". Keep disclaimer preservation, soften "material breach" to plain language.
- **Intellectual Property**: Add note that methodology and codebase are released under MIT license.
- **Account Suspension**: Soften tone for free tool context.
- **Audit and Logging**: Simplify language, keep substance.
- **Immediate Remedies**: Remove "refund for prepaid services" reference.
- **Contact**: Change `info@gasilov.com` → `arif@outliergov.com`

### 2. Privacy Policy (`src/pages/Privacy.tsx`) — Minor Edits

- **Subprocessors**: List the actual subprocessors (cloud hosting, auth, analytics) inline instead of "contact us for details"
- **Contact**: Change `info@gasilov.com` → `arif@outliergov.com` (2 instances)

### 3. SEO Landing Page Nav (`src/components/SEOLandingPage.tsx`)

- Rename nav item "Qui Tam Tools" → "Research Tools"
- Rename nav item "Fraud Data" → "Provider Registry"
- Change CTA from "Request Access" → "Explore the Registry" linking to `/auth`
- Update contact email consistency

### 4. Qui Tam Page → Public Accountability Research (`src/pages/QuiTamResearchTools.tsx`)

- Rename page title from "Qui Tam Research and Case Screening" → "Public Accountability Research Tools"
- Rewrite content to be audience-neutral (researchers, journalists, policymakers, public)
- Remove attorney-specific FAQs, replace with general accountability framing
- Update SEO metadata

### 5. Healthcare Fraud Data → Provider Registry (`src/pages/HealthcareFraudDataAttorneys.tsx`)

- Rename from "Healthcare Fraud Data for Attorneys" → "Medicare Outlier Registry"
- Rewrite "OutlierGov gives attorneys access to" → audience-neutral
- Remove Rule 9(b) paragraph
- Remove Rule 9(b) FAQ
- Update SEO metadata

### 6. Homepage (`src/pages/Index.tsx`)

- Update navCards to match renamed pages (titles, descriptions, routes)
- Change "Request Access" CTA → "Explore the Registry" linking to `/auth`
- Add visible statement: "Free and open-source public accountability tool"
- Add brief About blurb (who built it, mission)
- Update structured data contactType from "sales" to "customer service"

### 7. Medicare Billing Outlier Analysis (`src/pages/MedicareBillingOutlierAnalysis.tsx`)

- Update relatedLinks labels to match renamed pages

### 8. Routes (`src/App.tsx`)

- Rename route `/qui-tam-research-tools` → `/accountability-research-tools`
- Rename route `/healthcare-fraud-data-attorneys` → `/provider-registry`
- Keep old routes as redirects (or just change them — SEO pages are new)

### 9. Auth Page (`src/pages/Auth.tsx`)

- Soften "Sign in to access statistical anomaly analysis" → "Sign in to save watchlists and preferences" or similar, clarifying core data is browsable without login

### 10. Expired Page (`src/pages/Expired.tsx`)

- Change `info@gasilov.com` → `arif@outliergov.com`

### 11. All remaining `info@gasilov.com` references

- `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/Expired.tsx` — all → `arif@outliergov.com`

---

### Files Modified (10)

| File | Scope |
|------|-------|
| `src/pages/Terms.tsx` | Major rewrite |
| `src/pages/Privacy.tsx` | Minor edits (subprocessors, emails) |
| `src/components/SEOLandingPage.tsx` | Nav labels, CTA |
| `src/pages/QuiTamResearchTools.tsx` | Full rewrite + rename |
| `src/pages/HealthcareFraudDataAttorneys.tsx` | Full rewrite + rename |
| `src/pages/MedicareBillingOutlierAnalysis.tsx` | Related links update |
| `src/pages/Index.tsx` | Cards, CTA, about section |
| `src/pages/Auth.tsx` | Subtitle text |
| `src/pages/Expired.tsx` | Email update |
| `src/App.tsx` | Route paths |

### Not Changed
- Methodology page (clean, no changes needed per user)
- Dashboard disclaimer (already good)
- `AppLayout.tsx` (sidebar nav is for authenticated users, labels are fine)

