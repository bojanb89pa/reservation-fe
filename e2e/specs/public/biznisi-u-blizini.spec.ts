// E2E-003 · Biznisi u blizini
//
// `/businesses/near-me` čita poziciju preko `navigator.geolocation`, pa se
// lokacija lažira Playwright `geolocation`/`permissions` context opcijama
// (`test.use`), bez pravog browser prompta. Biznise pravi svaki test sam
// preko admin API-ja (`POST /businesses/admin` odmah aktivira biznis), sa
// realnim koordinatama u Novom Sadu i Nišu. Svaki test pravi i SVOJU
// kategoriju (`POST /business-categories`, jedinstven kod/naziv) i filtrira
// listu po njoj — deljene seed kategorije su ograničen, globalno vidljiv
// resurs (svega par top-level kategorija) koji paralelni testovi iz drugih
// spec fajlova takođe koriste, pa je biranje po indeksu iz seed liste
// (`topLevel[i]`) i dalje sudar čim se poklopi sa tuđim izborom — sopstvena
// kategorija to potpuno eliminiše.
//
// `GET /businesses/nearby` (BE) vraća samo lokacije sa `ownerConfirmed = true`
// (`BusinessLocationRepository.findNearestConfirmedLocations`), a
// `POST /businesses/admin` pravi lokaciju sa podrazumevanim `ownerConfirmed = false`
// — bez eksplicitne potvrde (`POST /businesses/{id}/locations/{locationId}/confirm`)
// biznis se NIKAD ne pojavljuje na `/businesses/near-me`, bez obzira na
// udaljenost ili kategoriju. To je pravi uzrok pada ovog fajla na CI (oba
// prethodna pokušaja su pogrešno pretpostavila trku oko deljene kategorije).

import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface BusinessCategoryDto {
  id: string;
  name: string;
  parentId: string | null;
}

interface PageResponseDto<T> {
  content: T[];
}

interface BusinessLocationRequest {
  name: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

interface BusinessLocationDto {
  id: string;
}

const NOVI_SAD = { latitude: 45.2671, longitude: 19.8335 };
const NIS = { latitude: 43.3209, longitude: 21.8958 };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `expect(res.ok())` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

function noviSadLocation(): BusinessLocationRequest {
  return {
    name: 'E2E lokacija Novi Sad',
    addressLine1: 'Bulevar oslobođenja 1',
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    ...NOVI_SAD,
  };
}

function nisLocation(): BusinessLocationRequest {
  return {
    name: 'E2E lokacija Niš',
    addressLine1: 'Obrenovićeva 1',
    city: 'Niš',
    postalCode: '18000',
    countryCode: 'RS',
    ...NIS,
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

/** Sopstvena top-level kategorija (jedinstven kod/naziv), da test ne deli seed kategorije sa drugima. */
async function createUniqueCategory(
  adminApi: ApiClient,
  prefix: string,
): Promise<BusinessCategoryDto> {
  const name = uniqueName(prefix);
  const code = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const created = await adminApi.post('/business-categories', {
    data: { code, translations: { en: name, sr: name } },
  });
  await expectOk(created, 'POST /business-categories');
  return (await created.json()) as BusinessCategoryDto;
}

/**
 * Aktivan biznis (admin kreacija je odmah aktivna) sa zadatom lokacijom i kategorijom,
 * čija je lokacija eksplicitno potvrđena — `/businesses/nearby` vraća samo lokacije sa
 * `ownerConfirmed = true`, a `POST /businesses/admin` ih pravi kao nepotvrđene.
 */
async function createActiveBusiness(
  adminApi: ApiClient,
  ownerId: string,
  location: BusinessLocationRequest,
  name: string,
  categoryId: string,
): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name, ownerId, location },
  });
  await expectOk(created, 'POST /businesses/admin');
  const business = (await created.json()) as BusinessDto;

  const categorized = await adminApi.put(`/businesses/${business.id}/category`, {
    data: { categoryId },
  });
  await expectOk(categorized, `PUT /businesses/${business.id}/category`);

  const locations = await adminApi.get(`/businesses/${business.id}/locations`);
  await expectOk(locations, `GET /businesses/${business.id}/locations`);
  const [businessLocation] = (await locations.json()) as BusinessLocationDto[];
  if (!businessLocation) {
    throw new Error(`biznis ${business.id} nema nijednu lokaciju (GET /businesses/${business.id}/locations)`);
  }

  const confirmed = await adminApi.post(
    `/businesses/${business.id}/locations/${businessLocation.id}/confirm`,
  );
  await expectOk(
    confirmed,
    `POST /businesses/${business.id}/locations/${businessLocation.id}/confirm`,
  );

  return business;
}

/** Redosled kartica na `/businesses/near-me` kao niz naziva biznisa, po redu prikaza. */
async function visibleBusinessOrder(page: Page): Promise<string[]> {
  return page.getByRole('link').allTextContents();
}

test.describe('E2E-003 biznisi u blizini', () => {
  test.describe('lokacija: centar Novog Sada', () => {
    test.use({ geolocation: NOVI_SAD, permissions: ['geolocation'] });

    test('novosadski biznis koji je test napravio je ispred niškog', async ({ page }) => {
      const owner = await createActivatedUser();
      const adminApi = await ApiClient.as(adminCredentials());
      try {
        const category = await createUniqueCategory(adminApi, 'E2E Kategorija NS');
        const ownerId = await fetchOwnerId(adminApi, owner.email);
        const nsBusiness = await createActiveBusiness(
          adminApi,
          ownerId,
          noviSadLocation(),
          uniqueName('E2E Blizu NS'),
          category.id,
        );
        const nisBusiness = await createActiveBusiness(
          adminApi,
          ownerId,
          nisLocation(),
          uniqueName('E2E Daleko Niš'),
          category.id,
        );

        await page.goto('/businesses/near-me');
        await page.getByRole('button', { name: new RegExp(escapeRegex(category.name)) }).click();

        await expect(
          page.getByRole('link', { name: new RegExp(escapeRegex(nsBusiness.name)) }),
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: new RegExp(escapeRegex(nisBusiness.name)) }),
        ).toBeVisible();

        const order = await visibleBusinessOrder(page);
        const nsIndex = order.findIndex((t) => t.includes(nsBusiness.name));
        const nisIndex = order.findIndex((t) => t.includes(nisBusiness.name));
        expect(
          nsIndex,
          'korisnik je u Novom Sadu — novosadski biznis treba da bude ispred niškog',
        ).toBeLessThan(nisIndex);
      } finally {
        await adminApi.dispose();
      }
    });
  });

  test.describe('lokacija: centar Niša', () => {
    test.use({ geolocation: NIS, permissions: ['geolocation'] });

    test('niški biznis koji je test napravio je ispred novosadskog', async ({ page }) => {
      const owner = await createActivatedUser();
      const adminApi = await ApiClient.as(adminCredentials());
      try {
        const category = await createUniqueCategory(adminApi, 'E2E Kategorija Niš');
        const ownerId = await fetchOwnerId(adminApi, owner.email);
        const nsBusiness = await createActiveBusiness(
          adminApi,
          ownerId,
          noviSadLocation(),
          uniqueName('E2E Daleko NS'),
          category.id,
        );
        const nisBusiness = await createActiveBusiness(
          adminApi,
          ownerId,
          nisLocation(),
          uniqueName('E2E Blizu Niš'),
          category.id,
        );

        await page.goto('/businesses/near-me');
        await page.getByRole('button', { name: new RegExp(escapeRegex(category.name)) }).click();

        await expect(
          page.getByRole('link', { name: new RegExp(escapeRegex(nsBusiness.name)) }),
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: new RegExp(escapeRegex(nisBusiness.name)) }),
        ).toBeVisible();

        const order = await visibleBusinessOrder(page);
        const nsIndex = order.findIndex((t) => t.includes(nsBusiness.name));
        const nisIndex = order.findIndex((t) => t.includes(nisBusiness.name));
        expect(
          nisIndex,
          'korisnik je u Nišu — niški biznis treba da bude ispred novosadskog',
        ).toBeLessThan(nsIndex);
      } finally {
        await adminApi.dispose();
      }
    });
  });

  test.describe('dozvola za lokaciju odbijena', () => {
    test.use({ permissions: [] });

    test('kad je dozvola za lokaciju odbijena prikazuje se jasna poruka, bez beskonačnog učitavanja @smoke', async ({
      page,
    }) => {
      await page.goto('/businesses/near-me');

      await expect(
        page.getByText(
          'Location access was denied. Allow location access to see businesses near you.',
        ),
      ).toBeVisible();
    });
  });
});
