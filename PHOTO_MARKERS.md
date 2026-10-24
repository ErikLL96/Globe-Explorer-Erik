# Photo markers on the globe

This update adds circular 40px photo markers for visited places that have at least one image in their Travel Journal.

## Behaviour

- The earliest-added saved photo becomes the round thumbnail for that destination.
- A normal green pin appears for visited places without photos; wishlist destinations keep their existing amber pins.
- Clicking a photo marker opens the existing destination details (and from there the Travel Journal).
- Adding or deleting a photo in the Travel Journal refreshes the globe marker right away.
- Photos are read from the browser’s existing IndexedDB storage. Small 96 × 96 thumbnails are generated locally in memory, and object URLs are revoked when no longer needed.
- Demo mode does not display a visitor’s personal photos.
- Pictures are private to each browser/origin and are **not** committed to GitHub or synced between devices.

## How to test

1. Run `npm install`, then `npm run dev` and open the local URL.
2. Select a **Visited** city, choose **Travel journal**, upload a JPG/PNG/WebP image.
3. Close the journal; a small round thumbnail should be at the city’s marker.
4. Rotate and zoom the globe: the image should remain anchored to its location, disappearing behind the far side.
5. Reopen the journal and delete the image: its marker should revert to a normal green pin.
6. Select a **Wishlist** city: it should retain the normal amber marker.
7. Reload the site: the thumbnail should reappear using locally saved photos.
8. Run `npm run check` before pushing. (Requires a supported Node.js version and dependencies.)

## Changed files

- `src/components/globe/TravelGlobe.tsx`
- `src/components/TravelJournal.tsx`
- `src/domain/photos.ts`
- `src/domain/photoThumbnails.ts` (new)
- `src/styles/app.css`
- `src/App.tsx`
