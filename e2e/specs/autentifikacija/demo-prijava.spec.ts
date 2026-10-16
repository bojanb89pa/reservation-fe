// Prijava postojećeg demo korisnika (`yarn seed:demo`), jedini @smoke tok sa
// prijavom. Na staging-u testovi ne smeju da prave naloge, pa se koristi
// nalog iz seed-a (`E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`). Proverava ceo
// OAuth tok nad pravom konfiguracijom (issuer, redirect URI, CORS), a ništa ne
// upisuje. U CI-ju radi zato što workflow pušta seed pre testova.

import { expect, loginInBrowser, test } from '../../fixtures/auth';
import { env } from '../../env';

test.describe('demo nalog', () => {
  test('demo korisnik se prijavljuje, vidi svoje rezervacije i odjavljuje se @smoke', async ({ page }) => {
    await loginInBrowser(page, { email: env.demoEmail, password: env.demoPassword });

    await page.goto('/my-reservations');
    await expect(page.getByRole('heading', { level: 1, name: 'My reservations' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL((url) => url.origin === new URL(env.baseUrl).origin);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 30_000 });
  });
});
