import { setWorkerUrl } from 'maplibre-gl';

// MapLibre v6 looks for its worker next to its own module, which Vite moves when bundling.
// scripts/copy-maplibre-worker.mjs places an untouched copy in public/vendor instead.
setWorkerUrl(new URL(`${import.meta.env.BASE_URL}vendor/maplibre-gl-worker.js`, window.location.href).href);
