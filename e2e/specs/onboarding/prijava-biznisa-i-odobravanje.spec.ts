// E2E-010 · Prijava novog biznisa i odobravanje
//
// Scenario: korisnik kroz /business-onboarding prijavljuje biznis (POST
// /businesses/submit) → biznis čeka odobrenje (status PENDING) → admin ga
// vidi na listi za odobravanje i aktivira → biznis je javno vidljiv, a
// podnosilac ga vidi u /dashboard/my-businesses.
//
// Sam čin slanja forme se ne testira klikom kroz Google Places autocomplete:
// GOOGLE_PLACES_API_KEY je u compose.e2e.yml namerno "e2e-unused" (kao što
// već napominje prazan-naziv-lokacije.spec.ts), pa je dugme za slanje forme
// bez izabranog mesta trajno onemogućeno. Zato testovi ispod prijavljuju
// biznis preko istog endpoint-a koji forma zove (POST /businesses/submit) i
// proveravaju da FE ispravno prikazuje posledično stanje (čekanje, admin
// lista, javna pretraga, dashboard vlasnika) — što je i suština kriterijuma
// prihvatanja.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
  status: string;
}

/** `expect(status)` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  expect(
    response.status(),
    `${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`,
  ).toBe(expected);
}

function uniqueLocationPayload() {
  return {
    name: uniqueName('Lokacija'),
    addressLine1: uniqueName('Ulica'),
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

/** Isti poziv koji `BusinessOnboardingPage` šalje za običnog korisnika (`POST /businesses/submit`). */
async function submitBusiness(ownerApi: ApiClient, name: string): Promise<BusinessDto> {
  const submitted = await ownerApi.post('/businesses/submit', {
    data: { name, location: uniqueLocationPayload() },
  });
  await expectStatus(submitted, 200, 'POST /businesses/submit');
  const business = (await submitted.json()) as BusinessDto;
  expect(business.status).toBe('PENDING');
  return business;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchFromHome(page: import('@playwright/test').Page, query: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'What' }).fill(query);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForURL((url) => url.pathname === '/search');
}

test.describe('E2E-010 prijava novog biznisa i odobravanje', () => {
  test('posle prijave korisnik vidi na /business-onboarding da biznis čeka odobrenje', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    try {
      await submitBusiness(ownerApi, uniqueName('E2E Onboarding Cekanje'));

      await loginAs(owner);
      await page.goto('/business-onboarding');

      await expect(page.getByRole('heading', { name: 'Application under review' })).toBeVisible();
      await expect(
        page.getByText('Your business has been submitted and is waiting for admin approval.', {
          exact: false,
        }),
      ).toBeVisible();
    } finally {
      await ownerApi.dispose();
    }
  });

  test('biznis koji čeka odobrenje nije vidljiv u javnoj pretrazi', async ({ page }) => {
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    try {
      const business = await submitBusiness(ownerApi, uniqueName('E2E Onboarding Pretraga'));
      // Pretraga poklapa pojedinačne reči, pa bi pun naziv vratio tuđe aktivne biznise sa istim
      // prefiksom ("E2E Onboarding"). Jedinstven sufiks iz `uniqueName` pripada samo ovom biznisu.
      const nameFragment = business.name.split(' ').pop() as string;
      const searchResponse = page.waitForResponse((response) =>
        response.url().includes('/v1/search'),
      );
      await searchFromHome(page, nameFragment);
      await searchResponse;

      await expect(page.getByText(`No results found for "${nameFragment}".`)).toBeVisible();
      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
      ).toHaveCount(0);
    } finally {
      await ownerApi.dispose();
    }
  });

  test('admin vidi biznis na čekanju na listi za odobravanje i aktivira ga', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    try {
      const business = await submitBusiness(ownerApi, uniqueName('E2E Onboarding Admin'));

      await loginAs(adminCredentials());
      await page.goto('/dashboard/businesses');

      const row = page.getByRole('link').filter({ hasText: business.name });
      await expect(row).toContainText('PENDING');

      await row.click();
      await page.waitForURL((url) => url.pathname === `/dashboard/businesses/${business.id}`);
      await expect(page.getByText('This business is pending approval.')).toBeVisible();

      await page.getByRole('button', { name: 'Activate' }).click();
      await expect(page.getByText('This business is pending approval.')).not.toBeVisible();
    } finally {
      await ownerApi.dispose();
    }
  });

  test('posle aktivacije biznis je vidljiv u javnoj pretrazi i podnosilac ga vidi u /dashboard/my-businesses', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    try {
      const business = await submitBusiness(ownerApi, uniqueName('E2E Onboarding Aktivacija'));

      const activated = await adminApi.post(`/businesses/${business.id}/activate`);
      await expectStatus(activated, 200, `POST /businesses/${business.id}/activate`);
      expect(((await activated.json()) as BusinessDto).status).toBe('ACTIVE');

      const nameFragment = business.name.split(' ').pop() as string;
      await searchFromHome(page, nameFragment);
      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
      ).toBeVisible();

      await loginAs(owner);
      await page.goto('/dashboard/my-businesses');
      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
      ).toBeVisible();
    } finally {
      await adminApi.dispose();
      await ownerApi.dispose();
    }
  });
});
