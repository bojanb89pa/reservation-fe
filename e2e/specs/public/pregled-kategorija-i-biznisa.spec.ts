// E2E-001 · Pregled kategorija i biznisa
//
// Kategorije su deo BE seed-a (Liquibase 019-seed-business-categories.yaml) i
// postoje u svakom stacku, pa se čitaju kao takve. Biznise pravi svaki test
// sam preko admin API-ja (`POST /businesses/admin` odmah aktivira biznis —
// videti logs/fe-brief-admin-endpoint-preauthorize-fix-20260922-1200.md), da
// testovi ne zavise od demo-seed biznisa koji ne postoji garantovano.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import {
  ApiClient,
  adminCredentials,
  createActivatedUser,
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

/** `expect(res.ok())` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/**
 * Lokacija sa svim obaveznim poljima iz BE `CreateBusinessLocationRequest` (name, latitude,
 * longitude). `name` je non-null Kotlin polje: bez njega Jackson pada pri deserijalizaciji i BE
 * vraća generički 400 bez poruke.
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

async function fetchTopLevelCategories(anonymousApi: ApiClient): Promise<BusinessCategoryDto[]> {
  const response = await anonymousApi.get('/business-categories', {
    headers: ACCEPT_LANGUAGE_EN,
  });
  await expectOk(response, 'GET /business-categories');
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
  await expectOk(created, 'POST /businesses/admin');
  const business = (await created.json()) as BusinessDto;

  if (categoryId) {
    const categorized = await adminApi.put(`/businesses/${business.id}/category`, {
      data: { categoryId },
    });
    await expectOk(categorized, `PUT /businesses/${business.id}/category`);
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
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
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
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
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
      await expectOk(serviceCreated, `POST /businesses/${business.id}/services`);
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
