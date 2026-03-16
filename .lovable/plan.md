

## Two Changes

### 1. Collapsible charts in `OutlierConcentrationCharts.tsx`
Wrap each chart card in a `Collapsible` (from the existing `@radix-ui/react-collapsible` component). The card header becomes the trigger with a chevron icon. Charts start **collapsed** by default.

- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
- Add `ChevronDown` icon from lucide that rotates when open
- Use `useState(false)` for each chart's open state

### 2. Inter font globally
- Add `<link>` to Google Fonts for Inter in `index.html`
- Set `font-family: 'Inter', sans-serif` on `body` in `src/index.css`

### Files modified
- `src/components/OutlierConcentrationCharts.tsx` — collapsible wrappers
- `index.html` — Google Fonts link
- `src/index.css` — font-family declaration

