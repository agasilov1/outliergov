

## Plan: Add Navigation to SEO Pages on Homepage

### Problem
The three SEO landing pages exist but there's no way to reach them from the homepage. Users landing on `/` have no idea those pages exist.

### Changes

**`src/pages/Index.tsx`** — Add a navigation section between the description and the CTA buttons:

- Add a section with 3 linked cards/links to the SEO pages:
  - "Medicare Billing Outlier Analysis" → `/medicare-billing-outlier-analysis`
  - "Qui Tam Research Tools" → `/qui-tam-research-tools`
  - "Healthcare Fraud Data for Attorneys" → `/healthcare-fraud-data-attorneys`
- Style as a simple row of cards (or stacked on mobile) with the page title and a one-line description each
- Uses `Link` from react-router-dom, no new dependencies

**`src/components/SEOLandingPage.tsx`** — Add a nav bar at the top:

- Add a horizontal nav strip below the logo header with links to all 3 SEO pages plus a "Home" link back to `/`
- Highlight the current page using the existing `useLocation` or path prop
- This gives navigation between SEO pages without returning to the homepage each time

### Layout after changes

**Homepage (`/`):**
```text
[Logo + OutlierGov]
[Description paragraph]
┌─────────────────────┐  ┌──────────────────┐  ┌────────────────────────┐
│ Medicare Billing     │  │ Qui Tam Research │  │ Healthcare Fraud Data  │
│ Outlier Analysis     │  │ Tools            │  │ for Attorneys          │
│ one-line summary     │  │ one-line summary │  │ one-line summary       │
└─────────────────────┘  └──────────────────┘  └────────────────────────┘
[Sign In]  [Request Access]
[Contact info]  [Privacy / Terms]
```

**SEO pages:**
```text
[Logo + OutlierGov]
[Home | Medicare Billing | Qui Tam | Fraud Data]  ← nav links
[H1, H2s, body, FAQ, Related, CTA, footer]
```

### Files modified
- `src/pages/Index.tsx` — add navigation cards section
- `src/components/SEOLandingPage.tsx` — add top nav bar with links to all pages + home

