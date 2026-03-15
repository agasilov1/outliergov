

## Plan: Redesign SEO Landing Pages and Homepage with Modern Visual Styling

### Problem
The pages are walls of plain text with zero visual hierarchy, no spacing rhythm, no cards, no icons, no color accents. They look like unstyled HTML from the 90s.

### Design Approach
Professional SaaS-style landing pages: hero sections with gradient backgrounds, stat callout cards, icon-accented feature sections, proper whitespace, and visual rhythm. Keep it clean and authoritative (legal/gov audience) but visually engaging.

### Changes

**`src/components/SEOLandingPage.tsx`** — Full visual overhaul of the shared layout:
- **Sticky header**: Full-width header with logo + nav, subtle border-bottom, proper padding
- **Hero section**: Large H1 with a subtle gradient background band, introductory paragraph in larger text
- **Content sections**: Children rendered inside styled cards with left-accent borders for H2 sections
- **Stat callouts**: Add a slot for highlight numbers (e.g., "1.2M providers", "2,200 outliers", "50 states")
- **FAQ section**: Styled as an accordion or cards with subtle backgrounds instead of flat text
- **CTA section**: Full-width gradient band with centered button, not a lonely button at the bottom
- **Footer**: Clean horizontal layout with proper spacing

**`src/pages/MedicareBillingOutlierAnalysis.tsx`** — Add visual elements:
- Add a `stats` array: `[{value: "1.2M", label: "Providers Screened"}, {value: "Top 0.5%", label: "Threshold"}, {value: "2,200", label: "Flagged Providers"}]`
- Pass stats to SEOLandingPage as a prop
- Wrap content paragraphs in proper section containers

**`src/pages/QuiTamResearchTools.tsx`** — Same treatment:
- Stats: e.g., "4 Stages Supported", "50 States", "Public Data"
- Proper section structure

**`src/pages/HealthcareFraudDataAttorneys.tsx`** — Same treatment:
- Stats: "3.7M Records", "50 States", "PDF Export"

**`src/pages/Index.tsx`** — Homepage polish:
- Hero section with gradient background behind the logo/title area
- Navigation cards get icons (Search, Scale, FileText from lucide), more padding, hover shadows
- Better vertical rhythm and spacing
- CTA buttons in a row on desktop instead of stacked

### Visual Structure for Each SEO Page

```text
┌──────────────────────────────────────────────┐
│ [Logo] OutlierGov    Home | Medicare | ...   │  ← sticky header
├──────────────────────────────────────────────┤
│                                              │
│  ░░░░░░ gradient background ░░░░░░░░░░░░░░░  │
│     H1: Medicare Billing Outlier Analysis    │
│     Intro paragraph in larger text           │
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ 1.2M   │  │Top 0.5%│  │ 2,200  │          │  ← stat cards
│  │Screened│  │Threshold│  │Flagged │          │
│  └────────┘  └────────┘  └────────┘          │
│                                              │
│  ┌─ How Peer Normalization Works ──────────┐ │
│  │ accent border   paragraph text...       │ │  ← content cards
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─ Data Source and Methodology ───────────┐ │
│  │ accent border   paragraph text...       │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ░░░░░ CTA gradient band ░░░░░░░░░░░░░░░░░  │
│       [Request Access]                       │
│       arif@gasilov.com                       │
│                                              │
│  FAQ (styled cards)                          │
│  Related links                               │
│  Footer                                     │
└──────────────────────────────────────────────┘
```

### Technical Details
- Use existing design system colors: `--primary`, `--accent`, `--muted`, `--card`
- Gradient backgrounds use Tailwind's `bg-gradient-to-br from-primary/5 to-accent/5`
- Stat cards use the existing Card components from `ui/card.tsx`
- FAQ items styled as bordered cards with padding
- Nav gets `sticky top-0 z-50 bg-background/95 backdrop-blur` for scroll behavior
- Add `stats` prop to `SEOLandingPageProps` as `{value: string, label: string}[]`
- Icons from lucide-react for homepage cards (Search, Scale, FileText)
- All changes are CSS/layout only — no new dependencies

### Files Modified
- `src/components/SEOLandingPage.tsx` — major visual redesign
- `src/pages/MedicareBillingOutlierAnalysis.tsx` — add stats, restructure content
- `src/pages/QuiTamResearchTools.tsx` — add stats, restructure content
- `src/pages/HealthcareFraudDataAttorneys.tsx` — add stats, restructure content
- `src/pages/Index.tsx` — polish homepage with gradient hero, card icons, better layout

