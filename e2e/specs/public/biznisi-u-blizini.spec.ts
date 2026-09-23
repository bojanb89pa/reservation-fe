// E2E-003 · Biznisi u blizini
//
// `/businesses/near-me` čita poziciju preko `navigator.geolocation`, pa se
// lokacija lažira Playwright `geolocation`/`permissions` context opcijama
// (`test.use`), bez pravog browser prompta. Biznise pravi svaki test sam
// preko admin API-ja (`POST /businesses/admin` odmah aktivira biznis), sa
// realnim koordinatama u Novom Sadu i Nišu. Oba biznisa dobijaju istu
// kategoriju i test filtrira listu po njoj, da izbegne šum od drugih
// paralelnih testova koji takođe prave biznise u Novom Sadu (BE nema limit
// radijusa — bez filtera bi ih paginacija od 12 po strane mogla progurati
// van prve strane).

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

async function fetchTopLevelCategories(anonymousApi: ApiClient): Promise<BusinessCategoryDto[]> {
  const response = await anonymousApi.get('/business-categories', {
    headers: { 'Accept-Language': 'en' },
  });
  await expectOk(response, 'GET /business-categories');
  const categories = (await response.json()) as BusinessCategoryDto[];
  return categories.filter((c) => c.parentId === null);
}

/** Aktivan biznis (admin kreacija je odmah aktivna) sa zadatom lokacijom i kategorijom. */
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

  return business;
}

/** Redosled kartica na `/businesses/near-me` kao niz naziva biznisa, po redu prikaza. */
async function visibleBusinessOrder(page: Page): Promise<string[]> {
  return page.getByRole('link').allTextContents();
}

test.describe('E2E-003 biznisi u blizini', () => {
  test.describe('lokacija: centar Novog Sada', () => {
    test.use({ geolocation: NOVI_SAD, permissions: ['geolocation'] });

    test('novosadski biznis koji je test napravio je ispred niškog', async ({
      page,
      anonymousApi,
    }) => {
      const topLevel = await fetchTopLevelCategories(anonymousApi);
      expect(
        topLevel.length,
        'seed treba da sadrži bar dve top-level kategorije — testovi u ovom fajlu rade paralelno i svaki uzima svoju, da izbegnu trku oko iste kategorije',
      ).toBeGreaterThanOrEqual(2);
      // Različita kategorija od suseda ("centar Niša") ispod — ta dva testa rade paralelno
      // (playwright.config.ts: fullyParallel), pa deljena kategorija dovodi do trke pri
      // kategorizaciji biznisa i biznis nasumično nestane iz filtrirane liste.
      const category = topLevel[topLevel.length - 1] as BusinessCategoryDto;

      const owner = await createActivatedUser();
      const adminApi = await ApiClient.as(adminCredentials());
      try {
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

    test('niški biznis koji je test napravio je ispred novosadskog', async ({
      page,
      anonymousApi,
    }) => {
      const topLevel = await fetchTopLevelCategories(anonymousApi);
      expect(
        topLevel.length,
        'seed treba da sadrži bar dve top-level kategorije — testovi u ovom fajlu rade paralelno i svaki uzima svoju, da izbegnu trku oko iste kategorije',
      ).toBeGreaterThanOrEqual(2);
      // Različita kategorija od suseda ("centar Novog Sada") iznad — videti komentar tamo.
      const category = topLevel[topLevel.length - 2] as BusinessCategoryDto;

      const owner = await createActivatedUser();
      const adminApi = await ApiClient.as(adminCredentials());
      try {
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
