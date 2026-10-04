// epic:41 · Mobilni: super admin ne može da otvori listu korisnika (nedostaje meni)
//
// Kontrolni tiket: https://github.com/bojanb89pa/reservation-agents/issues/41
//
// Pokriva: na uskom ekranu (mobilni) postoji navigacija kontrolne table, super admin
// iz nje otvara listu korisnika, a običan korisnik ne vidi admin stavke.

import { expect, test } from '../fixtures/auth';
import { adminCredentials } from '../fixtures/api';

const MOBILE = { width: 390, height: 844 };

test.describe('epic:41 mobilni meni kontrolne table', () => {
  test.use({ viewport: MOBILE });

  test('super admin na mobilnom otvara listu korisnika iz menija', async ({ page, loginAs }) => {
    await loginAs(adminCredentials());
    await page.goto('/dashboard');

    const nav = page.getByRole('navigation', { name: 'Dashboard navigation' });
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'Users', exact: true }).click();
    await page.waitForURL(/\/dashboard\/users$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  });

  test('običan korisnik na mobilnom ne vidi admin stavku Users u meniju', async ({
    page,
    loginAs,
    user,
  }) => {
    await loginAs(user);
    await page.goto('/dashboard');

    const nav = page.getByRole('navigation', { name: 'Dashboard navigation' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link').first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
  });
});
