

## Homepage Redesign — `src/pages/Index.tsx`

### Changes

1. **Dark gradient hero**: Replace `bg-gradient-to-br from-primary/5 via-background to-accent/5` with a dark navy-to-slate gradient (`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700`). All text in hero becomes white/light variants.

2. **Title & subtitle**: Increase title to `text-4xl sm:text-5xl font-extrabold text-white`. Change subtitle text to "Public Accountability Through Open Data".

3. **Stat bar**: Add a horizontal row of 3 metrics between the description and the nav cards section, styled as semi-transparent cards on the dark background:
   ```
   1.2M+              3.7M               2,200+
   Providers Screened  Records Analyzed   Outliers Identified
   ```
   Uses `grid grid-cols-3` with `text-white` values and `text-slate-300` labels.

4. **Nav cards**: Add `border-l-4 border-teal-500` for the left accent, plus `hover:shadow-lg hover:-translate-y-1 transition-all` for lift effect. Background stays `bg-card` on white section.

5. **No changes** to routes, links, button logic, About section, or footer.

### Technical Details
- Single file edit: `src/pages/Index.tsx`
- No new dependencies — all Tailwind utility classes
- Hero section gets dark treatment; everything below the stat bar remains on white/default background
- Description paragraph switches to `text-slate-300` for contrast on dark bg

