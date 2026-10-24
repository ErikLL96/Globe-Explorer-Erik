# AI-assisted development log

This document records how generative AI was used to design, build, test and improve Globe Explorer, as required by *Mandatory Assignment 3: Vibe Coding*. It describes what actually happened; the section at the end is left for the student team to describe their own contributions.

## How AI was used

The application was built with **Claude Code** (Anthropic's coding agent, model Claude Opus 5.5) working in the repository from a detailed product brief written by the student. The brief set the product vision, the three core features, the design direction, the data rules (for example the 195-country convention) and a list of ten acceptance tests.

Working from that brief, the agent:

1. Inspected the empty repository and the local toolchain (Node 24, npm, GitHub CLI) and created the branch `feat/globe-explorer-mvp`.
2. Checked current package versions and peer dependencies before choosing the stack. For example, TypeScript was pinned to 6.0 because `typescript-eslint` did not yet support TypeScript 7.
3. Verified MapLibre's globe API against the installed type definitions (`projection: { type: 'globe' }`, the `sky` / `atmosphere-blend` properties, and the marker occlusion options) rather than relying on memory.
4. Wrote a data build script that pulls country shapes and city coordinates from Natural Earth, so that no geographic data was invented.
5. Implemented the domain logic first, with unit tests, then the UI components and styles.
6. Ran the app in a real browser (the Claude desktop app's built-in browser), clicked through the acceptance tests, read the map state, inspected screenshots at desktop, tablet and mobile sizes, and fixed what it found.
7. Wrote this documentation and the README, and prepared the pull request.

## Key design and implementation decisions

| Decision | Why |
| --- | --- |
| **Own MapLibre style** instead of a third-party style URL | Full control over the dark editorial look. Low zooms are drawn from bundled Natural Earth polygons, so the globe and the highlighting keep working if the tile service is down. |
| **OpenFreeMap** for detail tiles | No API key and no registration; OpenStreetMap data with clear attribution. Its limits (a free service with no SLA) are documented. |
| **Country highlighting with a filter expression** (`['in', ['get','iso'], ['literal', codes]]`) on the bundled GeoJSON | Uses real polygons, updates instantly, and needs no feature state or IDs. |
| **DOM markers** (`maplibregl.Marker` with `<button>` elements) | Each marker is keyboard-focusable and has an accessible label. Circle vs diamond shapes mean status doesn't rely on colour alone. |
| **Domain layer with no React dependency** (`src/domain`) | Statistics, validation, deduplication and storage are pure functions that are easy to unit-test and to explain. |
| **Normalization layer for the 195 countries** | Natural Earth has 242 polygons. Territories map to their sovereign state; regions outside the convention never raise the percentage. |
| **Stable `locationId` for duplicates** | Curated cities use ids such as `no-oslo`; custom pins use `custom:<country>-<name>`. A place can therefore exist only once, never as two entries with different statuses. |
| **Demo mode in memory only** | Fictional sample data can never mix with or overwrite the user's real journey. |
| **Defensive storage** | A versioned key, per-record validation, deduplication on load, and a backup copy of unreadable data before anything is overwritten. |
| **Native `<dialog>`** for modals | Focus trapping, Escape-to-close and an inert background come from the browser rather than extra code. |
| **Self-hosted fonts** (Fontsource) | No request to Google Fonts. |

## Testing activities

### Automated (Vitest, `npm run test`)

36 unit tests in `src/domain/*.test.ts` cover:

- the 195 list (193 + 2), territory mapping, and excluded regions;
- statistics for Tests 1–5 (add visited, add wishlist, second city in the same country, wishlist → visited, deleting the last city in a country), mixed visited/wishlist countries, territories, and the `8 / 195 → 4.1%` example;
- duplicate prevention (Test 6), note validation, immutability, and refusing to change a destination into an existing one;
- persistence round-trip (Test 7), skipping identical writes, fresh install, malformed JSON with backup (Test 10), invalid and duplicate records, and storage that throws;
- search (case/accent-insensitive, country names, same-named cities), filtering (Test 8), and longitude wrapping at the date line;
- naming of custom regions without an ISO code (e.g. Natural Earth's `NE-SOL`);
- the curated dataset (≥ 80 unique cities, valid coordinates, every country code known to the normalization layer) and the demo data.

All checks were run with `npm run check` (type-check → lint → tests → build), which passed at the time of writing.

### In the browser

Run against the dev server and the production build (also served under a `/Globe-Explorer/` sub-path, as GitHub Pages would serve it). Results were confirmed by reading the DOM and the map's layer filters, not only by looking at screenshots:

| Test | What was checked | Result |
| --- | --- | --- |
| 1 Add visited | Oslo added via search and keyboard: teal marker, Norway in the `visited-fill` filter, stats 1 / 1, "New country unlocked: Norway" | Pass |
| 2 Add wishlist | Tokyo as wishlist: amber diamond marker, filter still only `NO`, wishlist 1 | Pass |
| 3 Same country | Bergen visited: cities 2, countries still 1, "Another place added to your story." | Pass |
| 4 Status change | "Mark as visited" on Tokyo: marker turns teal, filter `JP, NO`, 1.0%, Japan toast | Pass |
| 5 Delete | Deleting Oslo keeps Norway highlighted (Bergen remains); deleting Bergen removes it | Pass |
| 6 Duplicates | Re-adding Oslo shows "already in your journey", submit disabled, "Edit it instead" opens the existing entry | Pass |
| 7 Persistence | Reload keeps destinations and notes | Pass |
| 8 Filtering | All / Visited / Wishlist change both list rows and map markers (9 / 5 / 4 in demo) | Pass |
| 9 Responsive | 1440×900, 1024×768, 768×1024 and 390×844: no horizontal overflow, no overlapping panels, bottom sheet usable | Pass, after the fixes below |
| 10 Robustness | Fresh install shows the empty state; demo mode isolated from storage; corrupt JSON shows a warning, keeps a backup, no crash | Pass |

Also checked: a custom pin dropped in Sierra Leone was detected correctly and saved as `custom:sl-tiwai-island`; a Suva → Apia flight crossed the date line the short way (178.4 → −179.3 → −171.7); and "Surprise me" picked different wishlist entries and flew to them.

Not covered: real touch devices, screen-reader software, Safari/Firefox (only a Chromium-based browser was used), and very slow networks.

## Problems found and improvements made

These were found while running the app, not in theory:

1. **The map loaded with zero height.** MapLibre's stylesheet (`.maplibregl-map { position: relative }`) loaded after ours and overrode the absolute positioning. Fixed with a more specific selector.
2. **"Worker failed to load" in development.** MapLibre 6 finds its web worker relative to its own module, and Vite's dev server injects its HMR client into the worker file. This caused a ~6 s stall, or a map that never loaded. Fixed by copying the worker untouched into `public/vendor/` and calling `setWorkerUrl`.
3. **Slow first paint.** The globe now becomes interactive as soon as the bundled countries are loaded, instead of waiting for every remote tile.
4. **Focus went to the dialog's Close button**, because `showModal()` focuses the first focusable element. The modal now focuses the element marked `data-autofocus` (the search field, or "Keep it" in the delete confirmation).
5. **Keyboard focus was lost after choosing a search result** (the input unmounts). Focus now moves to the "Change destination" button.
6. **Markers on the far side of the globe showed through** at MapLibre's default 0.2 opacity and stayed clickable. They are now hidden and removed from the tab order.
7. **Toasts covered the details card.** The floating panels were reorganised: passport and banners on the left, toasts in the gap, details top-right (bottom-right on narrower screens), map controls on the right edge.
8. **Portrait tablets were cramped** (the globe was ~430 px wide). The bottom-sheet layout now applies up to 900 px.
9. **On phones the selected place was hidden** behind the passport or details card. The camera now uses padding so the place lands in the visible band between them.
10. **Text issues:** "Queenstown" broke mid-word, and the passport labels collided at narrow widths. The spotlight button becomes icon-only there, and the labels wrap.
11. **On phones the expanded attribution showed through the translucent details card.** The card is opaque on phones, and the attribution starts collapsed behind MapLibre's ⓘ button.
12. **Data quirks:** Natural Earth uses `-99` as the ISO code for France and Norway (the build uses `ISO_A2_EH` instead), and stores Copenhagen as "København" and Panama City under a different alternate name (mapped explicitly).
13. Also noted and documented rather than "fixed": Natural Earth's de facto Morocco polygon includes most of Western Sahara.

## Final QA review (before merging PR #1)

A second, independent review pass covered visual quality, UX, functional edge cases, performance, accessibility and the GitHub state. It found and fixed:

1. **Colour contrast below WCAG AA.** The `--faint` text colour (counters, coordinates, dates, fine print) was 3.6–4.0:1 on the panels and is now ≥ 4.8:1. White text on the primary button was 3.0–4.2:1 across its gradient and is now ≥ 5.0:1.
2. **Two open tabs could silently overwrite each other.** Each tab kept its own copy and the last save won. Tabs now adopt changes from the `storage` event, skip identical writes (so tabs don't echo each other), and no longer write the just-loaded state back on start-up. Verified with two real tabs in the browser.
3. **Focus was lost after deleting with the keyboard** (the row's delete button disappears). Focus now moves to the journey search, or to the sheet handle on phones.
4. **Clicking a marker while dropping a pin** selected that destination instead of placing the pin. Markers now ignore pointer events in pin mode.
5. **Custom pins in regions without an ISO code** (e.g. Somaliland, `NE-SOL`) showed the raw code in the passport stamp and the info text. They now show the saved place name, and the info text uses correct singular/plural grammar.
6. **The legend was hidden below 1180 px and on phones**, so tablet and phone users had no key for circle vs diamond vs filled country. It now shows at every size (once there is something on the map), and hides while a details card is open on small screens.
7. Small clean-ups: a redundant `role="radiogroup"` inside a `<fieldset>`, an `aria-label` on a non-interactive `<div>`, and the "tiles unavailable" notice moved so it can't collide with toasts.

Checked and found fine: Escape inside the city search clears it first and only closes the dialog on a second press; the keyboard tab order is logical; no horizontal overflow at 1440, 1024, 768 or 390 px; the bundled country data is ~430 kB gzipped and the JS ~375 kB gzipped, both acceptable for this prototype; CI on PR #1 passed.

## Light redesign (PR #2)

A follow-up session with Claude Code (Anthropic's coding agent) restyled the app from the dark space theme to a bright, minimal travel look, working from a reference mockup supplied by the team.

What changed and why:

| Decision | Why |
| --- | --- |
| **Drop the OpenFreeMap vector tiles** and draw everything from bundled Natural Earth data | The mockup asks for flat beige land with no roads, terrain or city labels. The local data already had everything needed, and the map no longer depends on a tile service. |
| **Country label points from Natural Earth** (`LABEL_X/LABEL_Y`, `LABELRANK`), generated by `scripts/build-geodata.mjs` into a separate file | One label per country (labelling the polygons directly would repeat a name on every island and tile edge), with zoom-dependent density by rank. Regenerating left `countries.geojson` and the cities byte-for-byte unchanged. |
| **One data-driven fill** (`case` + `in` on the polygon's `iso`) instead of a filtered highlight layer | Encodes the precedence visited → green, wishlist-only → blue, otherwise beige in a single expression; labels are tinted with the same rule. |
| **`computeCountryStatuses` in `src/domain/countryStatus.ts`** | The colour rule is a pure function of the destinations, so it is unit-tested and recalculated on every change (add, edit, delete, demo, reload, other tab). |
| **Colour tokens checked for WCAG AA** | The primary button is `#1570e3` (a shade darker than the mockup's `#1675e8`, which gave 4.4:1 with white text); secondary text is `#5a6b85` (≥ 4.6:1 on every light surface). |
| **No destination photos** | The mockup shows thumbnails, but they would need a remote image API; the list uses typography and spacing instead. |

Testing: 14 new unit tests (the eight required colour cases plus territories and a status change, and real evaluation of the MapLibre colour expressions with the MapLibre style-spec package). In the browser: country fill colours were read from the live map after each action — Iceland turned blue → green on "Mark as visited", Portugal green → beige on delete, Spain green → blue after deleting the last visited city and still blue after a reload, and beige after a delete in a second tab. Also checked: globe/flat toggle, zoom and overview controls, a fly-to across the date line, far-side markers hidden, and layouts at 1440, 1280, 1024, 768 and 390 px.

Problems found during the review: the five-item legend ran into the map attribution at 1024 px (it now wraps to two rows below 1180 px), and a CSS specificity slip kept the legend's separator visible on phones.

## Opportunities for students to document their own contributions

This section is intentionally left for the team. Suggested prompts:

- **Product and prompting:** How did you write and refine the brief? Which parts of the AI's output did you accept, question or change?
- **Review:** Which pieces of code did you read line by line? What did you need explained?
- **Testing:** Which tests did you run yourselves (ideally on your own phones and in other browsers)? What did you find?
- **Design choices:** Do you agree with the colours, typography, wording and layout? What would you change?
- **Ethics and limits:** Licensing and attribution of the map data, the political sensitivity of borders, privacy of local storage, and the reliability of AI-generated code.
- **Next steps:** Ideas such as export/import of your journey, trip dates, photos, or a self-hosted tile server.

> _Team members and their contributions:_
>
> - _…_
