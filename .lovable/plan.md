

## Plan: Move Table to Page 1 + Fix Key Metrics Overlap

### Changes to `src/lib/generateProviderPDF.ts`

**Issue 1: Move Per-Year Statistical Breakdown table to page 1**
- Move the table rendering block (lines 412-455) to immediately after the Data Context section (after line 377), before `addFooter(doc, 1)`
- The table will render on page 1 after Data Context. For providers with 2-3 year rows and 1-3 insight bullets, this fits comfortably
- If `y` is already too far down the page, jspdf-autotable handles page breaks automatically — the table will overflow to page 2 naturally
- Page 2 then only contains the two charts

**Issue 2: Fix key metrics row — split into two rows**
- 5 metrics in a single row with `CONTENT_W / 5` (~100pt per column) is too tight for values like "Nurse Practitioner, OH" and "10,479 providers"
- Split into two rows:
  - **Row 1**: Max Allowed Amount | Years as Outlier | Drug % (3 items, `CONTENT_W / 3` each ~168pt)
  - **Row 2**: Peer Group | Peer Group Size (2 items, `CONTENT_W / 2` each ~252pt)
- Row 1 at `y`, Row 2 at `y + 28`, then `y += 56` after both rows
- This gives each metric enough horizontal space to avoid overlap

### Files to modify
- `src/lib/generateProviderPDF.ts`

