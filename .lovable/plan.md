

## Plan: Fix PDF — Overlapping Elements, Fonts, and Stretched Charts

### Issues identified

1. **Overlapping elements on page 1**: Several spacing gaps are too tight (e.g., only 12pt after outlier box, 14pt between sections). The "Peer Group Snapshot" title/subtitle spacing is cramped.

2. **Font issues**: jsPDF's built-in `helvetica` looks poor at PDF rendering. Will switch to using **Helvetica** but with better size/weight discipline. The real issue is inconsistent sizing — some labels are 8pt, some 10pt, the outlier title is 11pt instead of 13pt, etc.

3. **Stretched charts**: The charts are captured at their DOM aspect ratio (roughly square cards in a 2-col grid) but rendered as `CONTENT_W × 200pt` (504×200), which stretches them horizontally. Fix: calculate the image height from the captured canvas's actual aspect ratio instead of hardcoding 200pt.

### Changes to `src/lib/generateProviderPDF.ts`

**Fix stretched charts (page 2):**
- After capturing each chart image, calculate the actual aspect ratio from the canvas dimensions
- Instead of `const imgH = 200`, compute: `const imgH = CONTENT_W * (canvas.height / canvas.width)`
- Cap max height at ~250pt so it doesn't overflow the page
- Change `captureChart` to return `{ dataUrl, width, height }` instead of just the data URL string, so aspect ratio info is available

**Fix overlapping / spacing:**
- Increase gap after outlier box: `y += boxHeight + 16` (was +12)
- Increase gap after Peer Group Snapshot subtitle before grid: `y += 16` (was +14)
- Increase gap after grid: `y += 54` (was +50)
- Increase gap after provider value line: `y += 20` (was +16)
- Increase gap after key metrics row: `y += 34` (was +30)
- Increase gap after data context title: `y += 14` (was +12)

**Fix fonts to spec:**
- Outlier box title: change from 11pt to 13pt bold
- Outlier box description: keep 8pt
- All section titles consistently 13pt bold
- Body labels consistently 10pt
- Secondary/small text consistently 8pt
- Peer snapshot values: 14pt bold (already correct)
- Peer median badge: 16pt bold (already correct)
- Footer: 7pt (already correct)

### Files to modify
- **`src/lib/generateProviderPDF.ts`** — All fixes in one pass

