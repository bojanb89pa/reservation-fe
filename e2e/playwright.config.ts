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
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/responsive/**',
      use: {
        ...devices['Desktop Chrome'],
        // Widget specovi serviraju host stranicu preko `page.route` sa "lažnog" origin-a
        // (javni address space) koji učitava widget.js sa loopback-a; Chromium Local Network
        // Access provera to inače blokira. Ovo ne menja ponašanje aplikacije.
        launchOptions: {
          args: [
            '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessForNavigations,BlockInsecurePrivateNetworkRequests',
          ],
        },
      },
    },
    {
      // Specovi u `specs/responsive/` rade samo ovde, u viewport-u 390×844.
      name: 'mobile',
      testMatch: '**/responsive/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
});
