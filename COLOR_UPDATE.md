# Globe Explorer — white map colour update

This variant changes only the visual palette and related documentation/tests.
It keeps all existing travel features and saved user data unchanged.

## Palette

- Unvisited land: **white** `#ffffff`
- Ocean: **soft grey-blue** `#eef4f8`
- Country borders: **grey-blue** `#bac7d2`
- Visited country fill: **green** `#43be8b`
- Wishlist-only country fill: **amber** `#ffbd6a`
- Country labels adapt for readability.
- Destination markers, legend, badges and brand icon use matching green/amber accents.

A country with both visited and wishlist destinations is **visited (green)**, following the existing logic.

## Change list

- `src/components/globe/globeStyle.ts` — globe colour palette
- `src/styles/base.css` — shared status tokens and neutral land palette
- `src/styles/app.css` — white/neutral background behind globe
- `src/components/globe/TravelGlobe.tsx` — corrected comment
- `src/components/globe/globeStyle.test.ts` — colour assertion and test title
- `src/components/Logo.tsx` — status accents in logo
- `public/favicon.svg` — status accents in favicon
- `README.md` — updated palette description

## Run locally

From the project folder:

```bash
npm install
npm run dev
```

The dev server normally updates the browser after a save; do a hard refresh if needed.

If you are merging with another student's live updates, **copy just the changed files** instead of replacing their entire updated repository. Use a new branch or commit before overwriting anything.
