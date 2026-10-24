/**
 * Copies MapLibre's web worker into public/vendor so it is served as a plain static file.
 * (Vite's dev server would otherwise inject its HMR client into the worker, which breaks it.)
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('maplibre-gl/package.json'));
const target = resolve(root, 'public/vendor/maplibre-gl-worker.js');

mkdirSync(dirname(target), { recursive: true });
copyFileSync(resolve(pkgDir, 'dist/maplibre-gl-worker.mjs'), target);
console.log('Copied MapLibre worker to public/vendor/');
