

## Plan: Fix PDF Export — 3 Issues

### Changes to `src/lib/generateProviderPDF.ts`

**Issue 1: Move Data Context to page 1, eliminate page 3**
- Move the Data Context section (lines 377–453) to after the Key Metrics row on page 1 (after line 274)
- Remove `doc.addPage()` for page 3 entirely
- Change `totalPages` from 3 to 2
- Update footer calls: page 1 footer after Data Context, page 2 footer stays

**Issue 2: Fix overlapping Y positions**
- Use a running `y` variable consistently (already mostly done, but some gaps are too small)
- After banner: `y = 75`
- After provider name: `y += 20`
- After NPI line: `y += 14`
- After rank line: `y += 14`
- After peer ratio badge: `y += 36`
- After outlier box: dynamically calculate box height based on `splitTextToSize` result, then `y += boxHeight + 12`
- After peer group snapshot grid: `y += 50`
- After provider value line: `y += 16`
- After key metrics row: `y += 30`
- After data context title/subtitle: `y += 16`
- Each data context insight box: calculate height from wrapped text, `y += height + 8`

**Issue 3: Fix fonts to spec**
- Provider name: bold 20pt ✓ (already correct)
- Section titles ("Peer Group Snapshot", "Data Context"): bold 13pt ✓ (already correct)
- Body text/labels: 10pt (change from mixed 9/10)
- Small/secondary text: 8pt (change disclaimer lines, subtitles)
- Peer group snapshot numbers: bold 14pt (change from 12pt)
- Peer median badge: bold 16pt (change from 14pt)
- Footer: 7pt #6b7280 — update gray color to match `[107, 114, 128]`

### Files to modify
- **`src/lib/generateProviderPDF.ts`** — All three fixes in one pass

