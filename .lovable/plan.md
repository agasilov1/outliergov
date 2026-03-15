

## Fix Restrictive Language Across Project

### Problem
Four files contain language ("All rights reserved", "internal screening use only", "Confidential - For Authorized Use Only") that contradicts the MIT-licensed, open-source, public-access model.

### Scan Results — All Instances Found

| File | Line(s) | Current Text | New Text |
|------|---------|-------------|----------|
| `src/lib/generateProviderPDF.ts` | 131 | `Data Source: CMS Medicare Part B \| For internal screening use only` | `Data Source: CMS Medicare Part B` |
| `src/lib/generateProviderPDF.ts` | 75 | `© 2026 OutlierGov. All rights reserved.` | `© 2026 OutlierGov. MIT License.` |
| `src/pages/ProviderDetail.tsx` | 459 | `...For internal screening use only` | `Statistical analysis only • Not a finding of fraud or wrongdoing • Data Source: CMS Medicare Part B` (remove the trailing clause) |
| `src/pages/ProviderDetail.tsx` | 965-967 | `Outputs are for internal analysis and screening only and may not be publicly distributed or presented as factual findings.` | `Outputs may be freely shared with disclaimers preserved.` |
| `src/components/AppLayout.tsx` | 205 | `© {new Date().getFullYear()} OutlierGov. All rights reserved.` | `© {new Date().getFullYear()} OutlierGov` |
| `src/components/ProviderBrief.tsx` | 381 | `Confidential - For Authorized Use Only` | `Free, open-source public accountability tool • MIT License` |

### Summary
6 edits across 4 files. No other instances of restrictive language found in the codebase.

