

## Fix: PDF Export Crash — jspdf-autotable v5 Import Issue

### Root Cause
The project uses `jspdf-autotable@^5.0.7`, but the code uses the **old v3 API** (`doc.autoTable({...})`). Starting with v4/v5, the side-effect import `import 'jspdf-autotable'` no longer patches the jsPDF prototype. The new API requires:

```ts
import { autoTable } from 'jspdf-autotable';
autoTable(doc, { ... });
```

Instead of the current:
```ts
import 'jspdf-autotable';
doc.autoTable({ ... });
```

This causes `doc.autoTable is not a function` at runtime, crashing immediately.

### Fix in `src/lib/generateProviderPDF.ts`
1. Change import from `import 'jspdf-autotable'` to `import { autoTable } from 'jspdf-autotable'`
2. Replace `doc.autoTable({...})` with `autoTable(doc, {...})`
3. Remove the `declare module 'jspdf'` augmentation that adds `autoTable` and `lastAutoTable` to the jsPDF interface (no longer needed)

### Files to modify
- **`src/lib/generateProviderPDF.ts`** — Fix import and call pattern

