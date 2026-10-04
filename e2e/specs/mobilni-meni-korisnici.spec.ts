// epic:41 · Mobilni: super admin ne može da otvori listu korisnika (nedostaje meni)
//
// Kontrolni tiket: https://github.com/bojanb89pa/reservation-agents/issues/41
//
// Pokriva: na uskom ekranu (mobilni) postoji navigacija kontrolne table, super admin
// iz nje otvara listu korisnika, a običan korisnik ne vidi admin stavke.

import { expect, test } from '../fixtures/auth';
import type { APIResponse } from '@playwright/test';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../fixtures/api';

const MOBILE = { width: 390, height: 844 };

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/**
 * Običan korisnik bez aktivnog biznisa se iz /dashboard šalje na /business-onboarding,
 * pa test pravi vlasnika sa aktivnim biznisom (admin kreacija je odmah aktivna).
 */
async function createOwnerWithActiveBusiness() {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const search = await adminApi.auth.get('users/admin/accounts', {
      params: { search: owner.email },
    });
    await expectOk(search, 'GET /auth/users/admin/accounts');
    const page = (await search.json()) as { content: { id: string; email: string }[] };
    const ownerId = page.content.find((u) => u.email === owner.email)?.id;
    if (!ownerId) throw new Error(`korisnik ${owner.email} nije pronađen u admin pretrazi`);

    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E Mobilni meni'),
        ownerId,
        location: {
          name: 'E2E lokacija',
          addressLine1: 'Bulevar oslobođenja 1',
          city: 'Novi Sad',
          postalCode: '21000',
          countryCode: 'RS',
          latitude: 45.2671,
          longitude: 19.8335,
        },
      },
    });
    await expectOk(created, 'POST /businesses/admin');
  } finally {
    await adminApi.dispose();
  }
  return owner;
}

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
  }) => {
    const owner = await createOwnerWithActiveBusiness();
    await loginAs(owner);
    await page.goto('/dashboard');

    const nav = page.getByRole('navigation', { name: 'Dashboard navigation' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link').first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
  });
});
