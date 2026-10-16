// E2E-002b · Jedinstvena pretraga sa autocomplete-om na početnoj
//
// Predlozi stižu sa `GET /v1/search/suggestions`: mesta pre kategorija pre biznisa.
// Test pravi biznis čiji naziv i grad počinju nazivom seed kategorije, pa isti upit
// vraća sva tri tipa predloga. Kategorije su deo BE seed-a (postoje u svakom stacku).

import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

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

/** Poravnat sa `Accept-Language` koji FE šalje za `locale: 'en-US'` iz playwright.config.ts. */
const ACCEPT_LANGUAGE_EN = { 'Accept-Language': 'en' };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
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

interface Fixture {
  category: BusinessCategoryDto;
  city: string;
  business: BusinessDto;
}

/**
 * Kategorija iz seed-a + aktivan biznis u njoj, čiji naziv i grad počinju nazivom kategorije,
 * pa upit `category.name` pogađa mesto, kategoriju i biznis.
 */
async function prepareFixture(): Promise<Fixture> {
  const anonymous = await ApiClient.anonymous();
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const categoriesResponse = await anonymous.get('/business-categories', {
      headers: ACCEPT_LANGUAGE_EN,
    });
    await expectOk(categoriesResponse, 'GET /business-categories');
    const categories = (await categoriesResponse.json()) as BusinessCategoryDto[];
    const category = categories.find((c) => c.parentId === null);
    if (!category) throw new Error('seed treba da sadrži bar jednu top-level kategoriju');

    const ownerId = await fetchOwnerId(adminApi, owner.email);
    const city = uniqueName(category.name);
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName(category.name),
        ownerId,
        location: {
          name: 'E2E lokacija',
          addressLine1: 'Bulevar oslobođenja 1',
          city,
          postalCode: '21000',
          countryCode: 'RS',
          latitude: 45.2671,
          longitude: 19.8335,
        },
      },
    });
    await expectOk(created, 'POST /businesses/admin');
    const business = (await created.json()) as BusinessDto;

    const categorized = await adminApi.put(`/businesses/${business.id}/category`, {
      data: { categoryId: category.id },
    });
    await expectOk(categorized, `PUT /businesses/${business.id}/category`);

    return { category, city, business };
  } finally {
    await anonymous.dispose();
    await adminApi.dispose();
  }
}

async function typeInSearch(page: Page, text: string) {
  await page.goto('/');
  const combobox = page.getByRole('combobox', { name: 'What' });
  await combobox.fill(text);
  await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeVisible();
  return combobox;
}

test.describe('E2E-002b jedinstvena pretraga sa autocomplete-om', () => {
  test('predlozi su poređani: mesto pre kategorije pre biznisa, svaki sa oznakom tipa', async ({
    page,
  }) => {
    const { category, city, business } = await prepareFixture();

    await typeInSearch(page, category.name);

    await expect(page.getByRole('option', { name: city, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: category.name, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: business.name, exact: true })).toBeVisible();

    const names = await page.getByRole('option').allTextContents();
    const placeIdx = names.indexOf(city);
    const categoryIdx = names.indexOf(category.name);
    const businessIdx = names.indexOf(business.name);
    expect(placeIdx).toBeGreaterThanOrEqual(0);
    expect(placeIdx).toBeLessThan(categoryIdx);
    expect(categoryIdx).toBeLessThan(businessIdx);

    // Zaglavlja grupa označavaju tip.
    await expect(page.getByRole('group', { name: 'Places' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Categories' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Businesses' })).toBeVisible();
  });

  test('izbor mesta vodi na pretragu filtriranu tim mestom', async ({ page }) => {
    const { category, city, business } = await prepareFixture();

    await typeInSearch(page, category.name);
    await page.getByRole('option', { name: city, exact: true }).click();

    await page.waitForURL(
      (url) => url.pathname === '/search' && url.searchParams.get('city') === city,
    );
    await expect(
      page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
    ).toBeVisible();
  });

  test('izbor kategorije vodi na listu biznisa te kategorije', async ({ page }) => {
    const { category, business } = await prepareFixture();

    await typeInSearch(page, category.name);
    await page.getByRole('option', { name: category.name, exact: true }).click();

    await page.waitForURL(`**/businesses/category/${category.id}`);
    await expect(
      page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
    ).toBeVisible();
  });

  test('izbor biznisa vodi na njegov detalj', async ({ page }) => {
    const { category, business } = await prepareFixture();

    await typeInSearch(page, category.name);
    await page.getByRole('option', { name: business.name, exact: true }).click();

    await page.waitForURL((url) => url.pathname === `/businesses/${business.id}`);
    await expect(page.getByRole('heading', { level: 1, name: business.name })).toBeVisible();
  });

  test('tastatura: strelice biraju predlog, Enter ga otvara, Esc zatvara listu', async ({
    page,
  }) => {
    const { city } = await prepareFixture();

    // Upit je jedinstveni grad ovog testa, pa ostaci drugih testova (isti prefiks kategorije)
    // ne mogu da uđu u listu ispred njega.
    const combobox = await typeInSearch(page, city);

    await combobox.press('Escape');
    await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeHidden();

    // Prva strelica ponovo otvara listu i markira prvi predlog (mesta su prva).
    await combobox.press('ArrowDown');
    const first = page.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveText(city);

    await combobox.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await combobox.press('ArrowUp');
    await expect(first).toHaveAttribute('aria-selected', 'true');

    await combobox.press('Enter');
    await page.waitForURL(
      (url) => url.pathname === '/search' && url.searchParams.get('city') === city,
    );
  });

  test('Enter bez izabranog predloga radi slobodnu pretragu @smoke', async ({ page }) => {
    const query = uniqueName('Slobodan upit');

    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });
    await combobox.fill(query);
    await combobox.press('Enter');

    await page.waitForURL(
      (url) =>
        url.pathname === '/search' &&
        url.searchParams.get('q') === query &&
        !url.searchParams.has('city'),
    );
  });

  test('naslovna i stranica rezultata imaju jedno polje pretrage umesto dva @smoke', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('combobox', { name: 'What' })).toBeVisible();
    await expect(page.getByText('Where', { exact: true })).toHaveCount(0);

    await page.goto('/search?q=test');
    await expect(page.getByRole('combobox', { name: 'What' })).toBeVisible();
    await expect(page.getByText('Where', { exact: true })).toHaveCount(0);
  });
});
