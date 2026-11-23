// epic:124 · Čišćenje WARNING komentara i sitnih nalaza iz pregleda #450
//
// Kriterijumi koje pokrivaju E2E testovi:
//  - stranica detalja partnera: izmena uključenosti sa 500 daje generičku poruku, sa 403 „zabranjeno";
//  - posle isteka sesije i ponovne prijave korisnik vidi obaveštenje tačno jednom.
// Ostali kriterijumi (brisanje komentara, `Object.assign` u apiError.ts) nemaju vidljivo
// ponašanje u browseru i pokriveni su vitest testovima.

import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser } from '../../fixtures/api';
import { createBusinessWithLocation, fetchUserId, registerPartner } from '../../fixtures/partners';
import { env } from '../../env';

const FORBIDDEN_MESSAGE = 'You are not allowed to change this partner, or the change failed.';
const GENERIC_MESSAGE = 'The change could not be saved. Please try again.';
const SESSION_NOTICE = 'Your session expired, you have been signed in again.';

/** Svaki PATCH ka `/admin/client-applications/{id}` vraća zadati status. */
async function failToggle(page: Page, partnerId: string, status: number): Promise<void> {
  await page.route(
    (url) => url.href.startsWith(`${env.apiUrl}/admin/client-applications/${partnerId}`),
    async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ status, message: 'e2e simulirana greška' }),
      });
    },
  );
}

async function setUpPartner(): Promise<{ id: string; name: string }> {
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const owner = await createActivatedUser();
    const ownerId = await fetchUserId(adminApi, owner.email);
    const { location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner greška');
    const partner = await registerPartner(adminApi, [location.id], 'E2E Partner greška');
    return { id: partner.id, name: partner.name };
  } finally {
    await adminApi.dispose();
  }
}

test.describe('epic:124 stranica detalja partnera: poruka o grešci pri izmeni uključenosti', () => {
  for (const { status, message, other } of [
    { status: 500, message: GENERIC_MESSAGE, other: FORBIDDEN_MESSAGE },
    { status: 403, message: FORBIDDEN_MESSAGE, other: GENERIC_MESSAGE },
  ]) {
    test(`HTTP ${status} pri isključivanju partnera prikazuje odgovarajuću poruku`, async ({ page, loginAs }) => {
      const partner = await setUpPartner();
      await loginAs(adminCredentials());
      await page.goto(`/dashboard/client-applications/${partner.id}`);
      await expect(page.getByRole('heading', { level: 1, name: partner.name })).toBeVisible();

      await failToggle(page, partner.id, status);
      await page.getByRole('switch', { name: `Partner ${partner.name} enabled` }).click();
      const dialog = page.getByRole('dialog', { name: `Disable ${partner.name}?` });
      await dialog.getByRole('button', { name: 'Disable partner' }).click();

      await expect(dialog.getByRole('alert')).toHaveText(message);
      await expect(page.getByText(other)).toHaveCount(0);
    });
  }
});

test.describe('epic:124 obaveštenje o istekloj sesiji', () => {
  test('posle isteka sesije i ponovne prijave obaveštenje se vidi jednom', async ({ page, user, loginAs }) => {
    await loginAs(user);
    await page.goto('/my-reservations');

    // Obnavljanje tokena (refresh_token grant) ne uspeva; code grant iz callback-a prolazi.
    await page.route(
      (url) => url.href.startsWith(`${env.authUrl}/oauth2/token`),
      async (route) => {
        if ((route.request().postData() ?? '').includes('grant_type=refresh_token')) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'invalid_grant' }),
          });
          return;
        }
        await route.fallback();
      },
    );
    // Prvi poziv ka API-ju vraća 401, što pokreće obnavljanje tokena, pa istek sesije.
    let rejected = false;
    await page.route(
      (url) => url.href.startsWith(`${env.apiUrl}/reservations`),
      async (route) => {
        if (!rejected) {
          rejected = true;
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ status: 401, error: 'Unauthorized' }),
          });
          return;
        }
        await route.fallback();
      },
    );
    await page.reload();

    // Auth-service sesija je još važeća, pa authorize vraća na FE; ako traži formu, prijavi se.
    const notice = page.getByRole('status').filter({ hasText: SESSION_NOTICE });
    await expect(async () => {
      if (await page.locator('#username').isVisible()) {
        await page.locator('#username').fill(user.email);
        await page.locator('#password').fill(user.password);
        await page.locator('form.auth-form button[type="submit"]').click();
      }
      await expect(notice).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000, intervals: [1_000] });

    await notice.getByRole('button', { name: 'Dismiss' }).click();
    await expect(notice).toBeHidden();

    // Flag je potrošen: ponovno učitavanje ne vraća obaveštenje.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(SESSION_NOTICE)).toHaveCount(0);
  });
});
