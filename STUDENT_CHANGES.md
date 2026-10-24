# Globe Explorer — student extensions

This version was created **from the white-map version** shared in this chat,
not necessarily the latest GitHub commit from your classmate. It is a separate
project copy. Review/merge changes before applying them to the shared branch.

## Added features
1. Optional **Year visited** in Add/Edit for visited destinations. Years are
   validated, persisted, and shown in the destination card and journey list.
2. **Timeline** button in the header opens a scrollable view grouped by year
   (descending); entries without year are grouped at the bottom. Select an entry
   to open its journal.
3. **Travel journal** for each visited destination. Existing notes can be edited
   up to 1500 characters. Add or remove up to six locally stored photos.
4. Extra tests for years, chronology, backwards-compatible storage, and file
   validation.

## Try it
- Open the project directory, run `npm install`, then `npm run dev`.
- Add a visited destination with a year (e.g. Lisbon, 2023), enter a note.
- Open Timeline and select Lisbon.
- Add a JPEG, PNG or WebP photo in Travel journal, close and reopen it.
- Refresh the page; your visit, year, notes and photos should remain.
- Change the year and confirm the timeline group updates.

## Important limitations
- No online accounts; photos are NOT synced between browsers or devices.
- Photos use IndexedDB, the rest of the data uses localStorage, so standard
  backups of localStorage alone do NOT include photo files.
- Clearing site data removes both notes and images. Take care with real photos.
- Unsupported HEIC uploads need converting to JPEG first.
- Images are only stored on the local device; they are not published to the web
  when this app is deployed.

## Additional improvement — photo markers

Visited destinations with saved journal pictures now show circular photos directly on the 3D globe. Thumbnails use the first saved picture, are generated locally, and update when pictures are added or removed. See `PHOTO_MARKERS.md` for testing and limitations.
