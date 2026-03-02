

## Plan: Fix Data Context empty state spacing in PDF

### Problem
When there are no Data Context insights, the fallback italic text is rendered but `y` is never incremented after it. The next section ("Per-Year Statistical Breakdown") starts immediately at the same `y`, causing overlap with the fallback text.

### Fix in `src/lib/generateProviderPDF.ts`

**Line 373**: After rendering the fallback text, add `y += 16;` to advance past it. This matches the spacing the bulleted version naturally creates via `y += insightBoxH + 8` in the loop.

Change the empty-state block (lines 369-374) from:
```
if (insights.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text('No specific data context flags identified for this provider.', MARGIN, y);
  } else {
```
to:
```
if (insights.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text('No specific data context flags identified for this provider.', MARGIN, y);
    y += 16;
  } else {
```

Single line addition. One file changed.

