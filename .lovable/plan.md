

## Plan: Programmatic PDF Export with jsPDF + html2canvas

### Overview
Replace the browser `window.print()` PDF export with a programmatically built multi-page PDF using jsPDF, html2canvas (for chart screenshots), and jspdf-autotable (for the data table). The PDF will have a professional layout matching the spec exactly.

### New packages required
- `jspdf` — PDF generation
- `html2canvas` — rasterize chart DOM elements
- `jspdf-autotable` — clean table rendering

### Architecture
Create a new utility module `src/lib/generateProviderPDF.ts` containing all PDF generation logic. The `handleExportPDF` function in `ProviderDetail.tsx` will call this utility, passing it the data and chart DOM element refs. A loading state ("Generating PDF...") will show while the PDF is being built.

### PDF Layout (3 pages)

**Page 1:**
1. **Top banner** — dark `#1e293b` rectangle, full width. "OutlierGov" left-aligned, disclaimer right-aligned, subtitle below.
2. **Provider header** — name (bold, large) + entity badge, NPI/Specialty/State line, "Ranked #X of Y (Top Z%)" line, large `#ef4444` badge with "XX.X× Peer Median".
3. **Verified Outlier box** — light red background, verification text with specialty/state and peer group context.
4. **Peer Group Snapshot** — title with year, 2×2 grid (Peer Size, Median, 75th, 99.5th), provider value + badge below.
5. **Key Metrics row** — Max Allowed, Years as Outlier, Peer Group, Peer Group Size.

**Page 2:**
1. **Bar chart** — use `html2canvas` to capture the existing `ProviderCharts` bar chart container from the DOM, embed as PNG.
2. **Line chart** — same approach for the trend chart.
3. **Per-Year table** — use `jspdf-autotable` with columns: Year, Beneficiaries, Services, Total Allowed, Allowed/Bene, Peer Median, vs Median, Percentile.

**Page 3 (or bottom of page 2):**
1. **Data Context** — title + subtitle, then each applicable bullet from DataContextCard logic.

**Footer on every page:**
- Left: "© 2026 OutlierGov. All rights reserved."
- Center: "outliergov.com"
- Right: "Page X of Y"

### Technical Details

**Chart capture approach:**
- Add `ref` attributes to the bar chart and line chart container divs in `ProviderCharts.tsx` via `forwardRef` or by passing ref props.
- In `ProviderDetail.tsx`, create refs for chart containers and pass them down.
- When generating the PDF, call `html2canvas(chartElement)` → `canvas.toDataURL('image/png')` → `doc.addImage()`.

**Changes to `ProviderDetail.tsx`:**
- Replace `handleExportPDF` body: set `isGeneratingPDF` state to true, call `generateProviderPDF(...)`, set false when done.
- Add `useRef` for bar chart and line chart containers.
- Add loading overlay/spinner when generating.
- Remove all `@media print` CSS and `print:` classes (they become unnecessary for this export path, but keep them for now as they don't hurt).

**Changes to `ProviderCharts.tsx`:**
- Accept optional `barChartRef` and `lineChartRef` props (React.RefObject) and attach them to the chart container divs so `html2canvas` can target them.

**New file `src/lib/generateProviderPDF.ts`:**
- Exports `async function generateProviderPDF(data, chartImages)` 
- Uses jsPDF in portrait, letter size, 0.75" margins
- Builds each section programmatically with Helvetica
- Handles page breaks and footer on each page
- Returns the PDF blob or triggers download directly

**Filename:** `{NPI}_{Provider_Name_underscored}.pdf` using existing `slugifyFilename` helper.

**ProviderBrief.tsx:** The old print-based brief dialog can remain for now but the main PDF button will use the new approach.

### Files to modify
- **`src/lib/generateProviderPDF.ts`** — New file, all PDF generation logic
- **`src/pages/ProviderDetail.tsx`** — New refs, loading state, call generateProviderPDF
- **`src/components/ProviderCharts.tsx`** — Accept chart container refs
- **`package.json`** — Add `jspdf`, `html2canvas`, `jspdf-autotable`

