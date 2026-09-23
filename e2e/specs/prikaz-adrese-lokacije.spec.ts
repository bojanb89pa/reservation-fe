// epic:20 · Prikaz adrese lokacije na javnom detalju biznisa
//
// GET /businesses/{id}/locations je do ovog epica tražio token, pa anoniman
// posetilac nije mogao da pročita adresu (logs/fe-brief-prikaz-adrese-lokacije-
// na-javnom-detalju-biznisa-20260923-120923.md). Testovi ispod proveravaju da
// je ruta sad javna (kao /businesses/*/services i /businesses/*/resources),
// da ostale metode i dalje traže token, i da FE detalj biznisa prikazuje
// adresu bar jedne lokacije bez logovanja, sa više lokacija, ulogovanom
// korisniku i na oba jezika.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

/** `expect(status)` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  expect(
    response.status(),
    `${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`,
  ).toBe(expected);
}

/**
 * `POST /businesses/admin` (bojanb89pa/reservation-be#103, videti
 * logs/fe-brief-admin-endpoint-preauthorize-fix-20260922-1200.md) traži pravi
 * `User.id`, ne JWT `sub` claim — čita se preko admin pretrage naloga.
 */
async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectStatus(response, 200, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

function novisadLocation(addressLine1: string) {
  return {
    name: uniqueName('Lokacija'),
    addressLine1,
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

function belgradeLocation(addressLine1: string) {
  return {
    name: uniqueName('Lokacija'),
    addressLine1,
    city: 'Beograd',
    postalCode: '11000',
    countryCode: 'RS',
    latitude: 44.8176,
    longitude: 20.4762,
  };
}

/** Aktivan biznis sa jednom lokacijom (admin kreacija je odmah aktivna, videti E2E-001). */
async function createActiveBusinessWithLocation(
  adminApi: ApiClient,
  ownerId: string,
  location: ReturnType<typeof novisadLocation>,
): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name: uniqueName('E2E Adresa'), ownerId, location },
  });
  await expectStatus(created, 200, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

test.describe('epic:20 prikaz adrese lokacije na javnom detalju biznisa', () => {
  test('GET /businesses/{id}/locations ne traži token; POST i dalje traži', async ({
    anonymousApi,
  }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const streetName = uniqueName('Ulica');
      const business = await createActiveBusinessWithLocation(
        adminApi,
        ownerId,
        novisadLocation(streetName),
      );

      const listed = await anonymousApi.get(`/businesses/${business.id}/locations`);
      await expectStatus(listed, 200, `GET /businesses/${business.id}/locations (bez tokena)`);
      const locations = (await listed.json()) as Array<{ addressLine1: string | null }>;
      expect(locations.some((l) => l.addressLine1 === streetName)).toBe(true);

      // fe-brief je tvrdio 200 [] za nepostojeći businessId, ali
      // GetBusinessLocationsByBusinessUseCaseImpl namerno baca NotFoundException
      // (postoji i BE unit test za to) — ruta vraća 404, kao i ostale rute biznisa.
      const unknownId = crypto.randomUUID();
      const unknown = await anonymousApi.get(`/businesses/${unknownId}/locations`);
      await expectStatus(unknown, 404, `GET /businesses/${unknownId}/locations (nepostojeći biznis)`);

      const createAttempt = await anonymousApi.post(`/businesses/${business.id}/locations`, {
        data: novisadLocation(uniqueName('Ulica')),
      });
      await expectStatus(
        createAttempt,
        401,
        `POST /businesses/${business.id}/locations (bez tokena)`,
      );
    } finally {
      await adminApi.dispose();
    }
  });

  test('javni detalj biznisa prikazuje adresu lokacije bez logovanja', async ({ page }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const streetName = uniqueName('Ulica');
      const business = await createActiveBusinessWithLocation(
        adminApi,
        ownerId,
        novisadLocation(streetName),
      );

      await page.goto(`/businesses/${business.id}`);
      await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();

      const locationsRegion = page.getByRole('region', { name: 'Locations' });
      await expect(locationsRegion).toBeVisible();
      await expect(locationsRegion.getByText(streetName)).toBeVisible();
      await expect(locationsRegion.getByText('21000 Novi Sad')).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('detalj prikazuje adrese svih lokacija, i ulogovanom korisniku, i na srpskom', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const streetA = uniqueName('Ulica Novi Sad');
      const streetB = uniqueName('Ulica Beograd');
      const business = await createActiveBusinessWithLocation(
        adminApi,
        ownerId,
        novisadLocation(streetA),
      );
      const secondLocation = await ownerApi.post(`/businesses/${business.id}/locations`, {
        data: belgradeLocation(streetB),
      });
      await expectStatus(secondLocation, 200, `POST /businesses/${business.id}/locations (vlasnik)`);

      await loginAs(owner);
      await page.goto(`/businesses/${business.id}`);

      const locationsRegionEn = page.getByRole('region', { name: 'Locations' });
      await expect(locationsRegionEn).toBeVisible();
      await expect(locationsRegionEn.getByText(streetA)).toBeVisible();
      await expect(locationsRegionEn.getByText('21000 Novi Sad')).toBeVisible();
      await expect(locationsRegionEn.getByText(streetB)).toBeVisible();
      await expect(locationsRegionEn.getByText('11000 Beograd')).toBeVisible();

      await page.getByRole('button', { name: 'SR', exact: true }).click();
      const locationsRegionSr = page.getByRole('region', { name: 'Lokacije' });
      await expect(locationsRegionSr).toBeVisible();
      await expect(locationsRegionSr.getByText(streetA)).toBeVisible();
      await expect(locationsRegionSr.getByText(streetB)).toBeVisible();
    } finally {
      await adminApi.dispose();
      await ownerApi.dispose();
    }
  });
});
