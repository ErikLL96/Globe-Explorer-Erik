/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base: './'` keeps asset URLs relative, so the build works on GitHub Pages
// sub-paths as well as on Vercel/Netlify roots.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // MapLibre GL alone is ~1 MB minified; that is expected for a WebGL map engine.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
