

## Plan: Update Landing Page — Logo, Request Access, Contact Info

### Changes to `src/pages/Index.tsx`

1. **Replace generic "O" box with uploaded logo**
   - Copy `user-uploads://OutlierGOV-BfiRyYwq.png` to `src/assets/OutlierGOV-logo.png`
   - Import it and replace the `<div className="flex h-14 w-14 ..."><span>O</span></div>` with an `<img>` tag using the logo (rounded, ~56px)

2. **Add "Request Access" button**
   - Add a secondary/outline button below the "Sign In" button that links to `mailto:arif@gasilov.com?subject=OutlierGov%20Access%20Request`
   - Uses `<a>` wrapped in a Button with variant="outline"

3. **Add contact line**
   - Add `Contact: arif@gasilov.com` as a small text line below the buttons, above the legal links

### Layout order after changes
- Logo image + "OutlierGov" title
- Description paragraph
- Sign In button
- Request Access button (outline variant, mailto link)
- "Contact: arif@gasilov.com" line
- Privacy / Terms links

### Files
- Copy uploaded image to `src/assets/OutlierGOV-logo.png`
- Edit `src/pages/Index.tsx`

