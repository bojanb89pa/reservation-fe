// E2E-002 · Pretraga biznisa
//
// Pretraga počinje na početnoj (polje "What" iz hero sekcije), rezultati se
// prikazuju na `/search`. Biznis pravi svaki test sam preko admin API-ja
// (`POST /businesses/admin` odmah aktivira biznis), da test ne zavisi od
// demo-seed biznisa koji ne postoji garantovano na CI stacku.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface BusinessServiceDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `expect(res.ok())` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/**
 * Lokacija sa svim obaveznim poljima iz BE `CreateBusinessLocationRequest` (name, latitude,
 * longitude). `name` je non-null Kotlin polje: bez njega Jackson pada pri deserijalizaciji.
 */
function novisadLocation() {
  return {
    name: 'E2E lokacija',
    addressLine1: 'Bulevar oslobođenja 1',
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

// `createActivatedUser()` ne vraća id korisnika, pa se ownerId čita preko admin pretrage naloga.
async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

/** Aktivan biznis (admin kreacija je odmah aktivna), bez kategorije — pretraga je nezavisna od nje. */
async function createActiveBusiness(adminApi: ApiClient, ownerId: string): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: {
      name: uniqueName('E2E Pretraga'),
      ownerId,
      location: novisadLocation(),
    },
  });
  await expectOk(created, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

async function createService(
  adminApi: ApiClient,
  businessId: string,
  name: string,
): Promise<BusinessServiceDto> {
  const created = await adminApi.post(`/businesses/${businessId}/services`, {
    data: {
      name,
      minDuration: 30,
      maxDuration: 30,
      durationUnit: 'MINUTES',
      durationStep: 15,
    },
  });
  await expectOk(created, `POST /businesses/${businessId}/services`);
  return (await created.json()) as BusinessServiceDto;
}

async function searchFromHome(page: import('@playwright/test').Page, query: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'What' }).fill(query);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForURL((url) => url.pathname === '/search');
}

test.describe('E2E-002 pretraga biznisa', () => {
  test('pretraga po delu naziva biznisa sa početne vraća taj biznis, klik vodi na detalj', async ({
    page,
  }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const business = await createActiveBusiness(adminApi, ownerId);
      // Jedinstveni sufiks iz `uniqueName` — deo naziva, ne ceo naziv (AC traži pretragu po delu).
      const nameFragment = business.name.split(' ').pop() as string;

      await searchFromHome(page, nameFragment);

      const result = page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) });
      await expect(result).toBeVisible();

      await result.click();
      await page.waitForURL((url) => url.pathname === `/businesses/${business.id}`);
      await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('pretraga po jedinstvenom nazivu usluge sa početne vraća biznis koji je nudi', async ({
    page,
  }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const business = await createActiveBusiness(adminApi, ownerId);
      const serviceName = uniqueName('E2E Usluga pretraga');
      await createService(adminApi, business.id, serviceName);

      await searchFromHome(page, serviceName);

      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
      ).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('pretraga bez rezultata prikazuje prazno stanje sa porukom @smoke', async ({ page }) => {
    const query = uniqueName('Nepostojeci upit');

    await searchFromHome(page, query);

    await expect(page.getByText(`No results found for "${query}".`)).toBeVisible();
  });
});
