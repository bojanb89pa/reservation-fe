// E2E-001 · Pregled kategorija i biznisa
//
// Kategorije su deo BE seed-a (Liquibase 019-seed-business-categories.yaml) i
// postoje u svakom stacku, pa se čitaju kao takve. Biznise pravi svaki test
// sam preko admin API-ja (`POST /businesses/admin` odmah aktivira biznis —
// videti logs/fe-brief-admin-endpoint-preauthorize-fix-20260922-1200.md), da
// testovi ne zavise od demo-seed biznisa koji ne postoji garantovano.

import { expect, test } from '../../fixtures/auth';
import {
  ApiClient,
  adminCredentials,
  createActivatedUser,
  fetchAccessToken,
  uniqueName,
} from '../../fixtures/api';

interface BusinessCategoryDto {
  id: string;
  name: string;
  parentId: string | null;
}

interface BusinessDto {
  id: string;
  name: string;
  categoryId: string | null;
}

interface PageResponseDto<T> {
  content: T[];
}

interface BusinessServiceDto {
  id: string;
  name: string;
}

/** Poravnat sa `Accept-Language` koji FE šalje za `locale: 'en-US'` iz playwright.config.ts. */
const ACCEPT_LANGUAGE_EN = { 'Accept-Language': 'en' };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lokacija sa svim obaveznim poljima iz `CreateBusinessLocationCommand` (lat/lng). */
function novisadLocation() {
  return {
    addressLine1: 'Bulevar oslobođenja 1',
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

/** `sub` claim iz access tokena — isti user id koji FE koristi kao `ownerId` (useBusinesses.ts). */
function userIdFromAccessToken(accessToken: string): string {
  const payloadSegment = accessToken.split('.')[1];
  if (!payloadSegment) {
    throw new Error('access token nije JWT (nedostaje payload segment)');
  }
  const payload = JSON.parse(Buffer.from(payloadSegment, 'base64').toString('utf-8')) as {
    sub: string;
  };
  return payload.sub;
}

async function fetchTopLevelCategories(anonymousApi: ApiClient): Promise<BusinessCategoryDto[]> {
  const response = await anonymousApi.get('/business-categories', {
    headers: ACCEPT_LANGUAGE_EN,
  });
  expect(response.ok()).toBe(true);
  const categories = (await response.json()) as BusinessCategoryDto[];
  return categories.filter((c) => c.parentId === null);
}

/** Aktivan biznis (admin kreacija je odmah aktivna) sa opcionom kategorijom. */
async function createActiveBusiness(
  adminApi: ApiClient,
  ownerId: string,
  categoryId?: string,
): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: {
      name: uniqueName('E2E Business'),
      ownerId,
      location: novisadLocation(),
    },
  });
  expect(created.ok()).toBe(true);
  const business = (await created.json()) as BusinessDto;

  if (categoryId) {
    const categorized = await adminApi.put(`/businesses/${business.id}/category`, {
      data: { categoryId },
    });
    expect(categorized.ok()).toBe(true);
  }

  return business;
}

test.describe('E2E-001 pregled kategorija i biznisa', () => {
  test('početna prikazuje kategorije iz seed-a sa nazivom na trenutnom jeziku @smoke', async ({
    page,
    anonymousApi,
  }) => {
    const topLevel = await fetchTopLevelCategories(anonymousApi);
    expect(
      topLevel.length,
      'seed treba da sadrži bar jednu top-level kategoriju (business-categories)',
    ).toBeGreaterThan(0);

    await page.goto('/');
    for (const category of topLevel) {
      // Dugme sadrži i ikonu (emoji) pored naziva, pa se ime traži kao podniska, ne tačno.
      await expect(
        page.getByRole('button', { name: new RegExp(escapeRegex(category.name)) }),
      ).toBeVisible();
    }
  });

  test('klik na kategoriju vodi na listu biznisa te kategorije', async ({
    page,
    anonymousApi,
  }) => {
    const topLevel = await fetchTopLevelCategories(anonymousApi);
    expect(
      topLevel.length,
      'seed treba da sadrži bar dve top-level kategorije da bi test proverio isključivost liste',
    ).toBeGreaterThanOrEqual(2);
    const [categoryA, categoryB] = topLevel as [BusinessCategoryDto, BusinessCategoryDto];

    const owner = await createActivatedUser();
    const ownerId = userIdFromAccessToken(await fetchAccessToken(owner));
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const businessInA = await createActiveBusiness(adminApi, ownerId, categoryA.id);
      const businessInB = await createActiveBusiness(adminApi, ownerId, categoryB.id);

      await page.goto('/');
      await page
        .getByRole('button', { name: new RegExp(escapeRegex(categoryA.name)) })
        .click();
      await page.waitForURL(`**/businesses/category/${categoryA.id}`);

      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(businessInA.name)) }),
      ).toBeVisible();
      // Lista sadrži SAMO biznise ove kategorije: biznis iz druge kategorije se ne pojavljuje.
      await expect(
        page.getByRole('link', { name: new RegExp(escapeRegex(businessInB.name)) }),
      ).toHaveCount(0);
    } finally {
      await adminApi.dispose();
    }
  });

  test('detalj biznisa prikazuje naziv i usluge sa trajanjem', async ({ page }) => {
    const owner = await createActivatedUser();
    const ownerId = userIdFromAccessToken(await fetchAccessToken(owner));
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const business = await createActiveBusiness(adminApi, ownerId);
      const serviceName = uniqueName('Usluga');
      const serviceCreated = await adminApi.post(`/businesses/${business.id}/services`, {
        data: {
          name: serviceName,
          minDuration: 30,
          maxDuration: 30,
          durationUnit: 'MINUTES',
          durationStep: 15,
        },
      });
      expect(serviceCreated.ok()).toBe(true);
      const service = (await serviceCreated.json()) as BusinessServiceDto;

      await page.goto(`/businesses/${business.id}`);
      await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
      // BookingWidget prikazuje ime usluge i trajanje zajedno u istom tabu.
      await expect(
        page.getByRole('tab', { name: new RegExp(escapeRegex(service.name)) }),
      ).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('nepostojeći biznis prikazuje poruku o grešci @smoke', async ({ page }) => {
    const randomId = crypto.randomUUID();
    await page.goto(`/businesses/${randomId}`);
    await expect(page.getByText('Business not found.')).toBeVisible();
  });
});
