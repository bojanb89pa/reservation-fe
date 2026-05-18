import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@domain':         fileURLToPath(new URL('./modules/domain/src/index.ts', import.meta.url)),
      '@application':    fileURLToPath(new URL('./modules/application/src/index.ts', import.meta.url)),
      '@infrastructure': fileURLToPath(new URL('./modules/infrastructure/src/index.ts', import.meta.url)),
      '@ui':             fileURLToPath(new URL('./modules/ui/src/index.ts', import.meta.url)),
      '@':               fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
