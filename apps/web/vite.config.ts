import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Paketi iz modules/ (`@fe/*`) se razrešavaju kao workspace paketi iz
// izvornog koda (`exports` → src/index.ts), bez aliasa. `.env` ostaje u
// root-u repoa, pored `.env.example`.
export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
});
