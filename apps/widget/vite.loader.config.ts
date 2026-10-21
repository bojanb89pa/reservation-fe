import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Loader `widget.js`: samostalan IIFE bundle bez Reacta, na korenu FE-a (`/widget.js`).
// Naziv fajla je javni ugovor, bez hash-a.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('../web/dist', import.meta.url)),
    emptyOutDir: false,
    target: 'es2019',
    lib: {
      entry: fileURLToPath(new URL('./src/loader/index.ts', import.meta.url)),
      formats: ['iife'],
      name: 'ReservaWidgetLoader',
      fileName: () => 'widget.js',
    },
  },
});
