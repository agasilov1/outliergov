

## Always-Visible AI Summary Card with Skeleton Loader

### Change: `src/pages/ProviderDetail.tsx` (line 639)

Replace the conditional `{aiSummary !== undefined && (` with no condition — always render the card. Update the loading state to show "Generating AI summary..." text alongside the skeleton.

**Line 639**: Remove `{aiSummary !== undefined && (` — just render `<Card>` directly.

**Lines 649-653**: Update the loading skeleton to include the "Generating AI summary..." message:
```tsx
{isAiLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <p className="text-xs text-muted-foreground mt-2 animate-pulse">Generating AI summary...</p>
  </div>
)
```

**Line 668**: Remove the closing `)}` that paired with the old conditional.

One file, three small edits.

