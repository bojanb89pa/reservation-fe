import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Iframe aplikacija se servira pod `/widget/`. Izlaz ide u `apps/web/dist/widget`, pa
// postojeći FE image (nginx) i `vite preview` servira i widget; loader `widget.js` ide
// pored njega (vidi vite.loader.config.ts). `yarn build` mora prvo da izgradi apps/web.
export default defineConfig({
  base: '/widget/',
  plugins: [react()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: { port: 5174 },
  build: {
    outDir: fileURLToPath(new URL('../web/dist/widget', import.meta.url)),
    emptyOutDir: true,
  },
});
