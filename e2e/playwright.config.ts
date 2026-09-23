import { defineConfig, devices } from '@playwright/test';
import { env } from './env';

export default defineConfig({
  testDir: './specs',
  // Svaki test sam pravi svoje podatke sa jedinstvenim imenima, pa mogu
  // paralelno; u CI-ju dva workera da stack od 384 MB po servisu ne puca.
  fullyParallel: true,
  workers: process.env['CI'] ? 2 : undefined,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: env.baseUrl,
    locale: 'en-US',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
