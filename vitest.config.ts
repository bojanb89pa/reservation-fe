import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './apps/web/src/test/setup.ts',
    // Playwright specovi imaju svoj runner (e2e/), vitest ih ne sme pokupiti.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
