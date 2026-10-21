import { defineConfig } from 'vite';

// Samostalna aplikacija: ne uvozi nijedan `@fe/*` paket (vidi root eslint.config.js) i ne ulazi
// u root `yarn build`. Port 5175 je na `frame-ancestors` listi widget-a (vite preview / nginx).
export default defineConfig({
  server: { port: 5175, strictPort: true },
  preview: { port: 5175, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
