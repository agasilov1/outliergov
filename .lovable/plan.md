

# Remove Contact Email from Landing Page

## Summary
Remove the "Contact: info@gasilov.com" link from the main landing page (`/`) while preserving all other elements.

## Current Code (src/pages/Index.tsx)
Lines 48-51 contain the contact link:
```tsx
<a 
  href="mailto:info@gasilov.com" 
  className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
>
  Contact: info@gasilov.com
</a>
```

## Change
Delete the entire `<a>` element (lines 48-51).

## What Stays Unchanged
- Logo and branding
- Main statement text
- Sign In button
- Privacy Policy and Terms of Service links
- All styling and layout

## Technical Details
Single file edit: `src/pages/Index.tsx` - remove 4 lines

