// E2E-019 · Jezik sr/en
//
// Kategorije su deo BE seed-a (Liquibase 019-seed-business-categories.yaml, sr/en prevodi), pa se
// njihovi nazivi čitaju iz API-ja po `Accept-Language`. Deo koji ne upisuje ništa je @smoke; lista i
// detalj biznisa zahtevaju biznis koji test pravi sam, pa nisu @smoke.

import type { APIResponse, Page } from '@playwright/test';
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
}

interface PageResponseDto<T> {
  content: T[];
}

/** Ključevi iz i18n resursa u obliku `namespace.kljuc` koji bi se pojavili da prevod fali. */
const RAW_KEY = /\b(nav|home|businessList|businessDetail|footer)\.[A-Za-z]+\b/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

async function fetchTopLevelCategories(
  anonymousApi: ApiClient,
  language: 'sr' | 'en',
): Promise<BusinessCategoryDto[]> {
  const response = await anonymousApi.get('/business-categories', {
    headers: { 'Accept-Language': language },
  });
  await expectOk(response, `GET /business-categories (${language})`);
  const categories = (await response.json()) as BusinessCategoryDto[];
  return categories.filter((c) => c.parentId === null);
}

async function switchLanguage(page: Page, language: 'SR' | 'EN'): Promise<void> {
  await page.getByRole('button', { name: language, exact: true }).click();
}

async function expectNoRawKeys(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toContainText(RAW_KEY);
}

async function expectCategoriesVisible(
  page: Page,
  categories: BusinessCategoryDto[],
): Promise<void> {
  for (const category of categories) {
    await expect(
      page.getByRole('button', { name: new RegExp(escapeRegex(category.name)) }),
    ).toBeVisible();
  }
}

async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const accounts = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = accounts.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

test.describe('E2E-019 jezik sr/en', () => {
  test('prebacivanje na en prikazuje navigaciju i kategorije na engleskom @smoke', async ({
    page,
    anonymousApi,
  }) => {
    const categoriesSr = await fetchTopLevelCategories(anonymousApi, 'sr');
    const categoriesEn = await fetchTopLevelCategories(anonymousApi, 'en');
    expect(categoriesEn.length, 'seed treba da sadrži top-level kategorije').toBeGreaterThan(0);

    await page.goto('/');
    // Najpre srpski, da prebacivanje na en zaista nešto menja.
    await switchLanguage(page, 'SR');
    await expect(page.getByRole('link', { name: 'Pretraži', exact: true })).toBeVisible();
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'Za biznise', exact: true })).toBeVisible();
    await expectCategoriesVisible(page, categoriesSr);
    await expectNoRawKeys(page);

    await switchLanguage(page, 'EN');
    await expect(page.getByRole('link', { name: 'Browse', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'For businesses', exact: true })).toBeVisible();
    await expectCategoriesVisible(page, categoriesEn);
    await expectNoRawKeys(page);
  });

  test('izbor jezika se pamti posle osvežavanja @smoke', async ({ page, anonymousApi }) => {
    const categoriesSr = await fetchTopLevelCategories(anonymousApi, 'sr');

    await page.goto('/');
    await switchLanguage(page, 'SR');
    await expect(page.getByRole('link', { name: 'Pretraži', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: 'Pretraži', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse', exact: true })).toHaveCount(0);
    await expectCategoriesVisible(page, categoriesSr);
  });

  test('lista i detalj biznisa nemaju sirove i18n ključeve u oba jezika', async ({ page }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    let business: BusinessDto;
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const created = await adminApi.post('/businesses/admin', {
        data: {
          name: uniqueName('E2E Jezik'),
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
      business = (await created.json()) as BusinessDto;
    } finally {
      await adminApi.dispose();
    }

    await page.goto('/businesses');
    await switchLanguage(page, 'SR');
    await expect(page.getByRole('button', { name: 'Svi', exact: true })).toBeVisible();
    await expectNoRawKeys(page);

    await switchLanguage(page, 'EN');
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expectNoRawKeys(page);

    await page.goto(`/businesses/${business.id}`);
    await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
    await expectNoRawKeys(page);

    await switchLanguage(page, 'SR');
    await expect(page.getByRole('link', { name: 'Pretraži', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
    await expectNoRawKeys(page);
  });
});
