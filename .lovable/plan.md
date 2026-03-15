

## Add Visible Disclaimer to AI Summary Card

### What
Add a disclaimer line below the AI-generated summary text in the provider detail page.

### Change: `src/pages/ProviderDetail.tsx` (lines 656-658)

Replace the summary paragraph:
```tsx
<p className="text-sm leading-relaxed">{aiSummary}</p>
```

With:
```tsx
<>
  <p className="text-sm leading-relaxed">{aiSummary}</p>
  <p className="text-xs text-muted-foreground mt-2 italic">
    AI-generated from public CMS data. Does not allege fraud or wrongdoing.
  </p>
</>
```

### Already confirmed
- Edge function system prompt includes: "Never allege fraud, wrongdoing, or intent. Use neutral language."
- User prompt includes: "Do not allege fraud or wrongdoing. Focus on describing the pattern factually."
- OpenAI API key is working — test call returned a clean summary with `cached: false`, status 200.

