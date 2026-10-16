// Polje pretrage na naslovnoj: kucanje bilo gde, klik na traku i lista predloga koja skroluje.
//
// Predlozi stižu sa `GET /v1/search/suggestions` (najviše 10 stavki). Test pravi više biznisa u
// različitim gradovima sa istim jedinstvenim prefiksom, pa upit tim prefiksom vraća grupu mesta
// i grupu biznisa, dovoljno dugu da prelazi `max-height` liste.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

const BUSINESS_COUNT = 6;

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/** Pravi `BUSINESS_COUNT` aktivnih biznisa čiji nazivi počinju istim prefiksom, svaki u svom gradu. */
async function prepareBusinesses(): Promise<{ prefix: string; businesses: BusinessDto[] }> {
  const prefix = uniqueName('Pretraga');
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const accounts = await adminApi.auth.get('users/admin/accounts', {
      params: { search: owner.email },
    });
    await expectOk(accounts, 'GET /auth/users/admin/accounts');
    const found = (await accounts.json()) as PageResponseDto<{ id: string; email: string }>;
    const ownerId = found.content.find((u) => u.email === owner.email)?.id;
    if (!ownerId) throw new Error(`korisnik ${owner.email} nije pronađen u admin pretrazi`);

    const businesses: BusinessDto[] = [];
    for (let i = 0; i < BUSINESS_COUNT; i++) {
      const created = await adminApi.post('/businesses/admin', {
        data: {
          name: `${prefix} biznis ${i}`,
          ownerId,
          location: {
            name: 'E2E lokacija',
            addressLine1: 'Bulevar oslobođenja 1',
            city: `${prefix} grad ${i}`,
            postalCode: '21000',
            countryCode: 'RS',
            latitude: 45.2671,
            longitude: 19.8335,
          },
        },
      });
      await expectOk(created, 'POST /businesses/admin');
      businesses.push((await created.json()) as BusinessDto);
    }
    return { prefix, businesses };
  } finally {
    await adminApi.dispose();
  }
}

test.describe('Polje pretrage na naslovnoj: fokus i lista predloga', () => {
  test('kucanje bez klika u polje fokusira pretragu, upisuje tekst i otvara predloge', async ({
    page,
  }) => {
    const { prefix } = await prepareBusinesses();

    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });
    await expect(combobox).toBeVisible();
    await expect(combobox).not.toBeFocused();

    await page.keyboard.type(prefix);

    await expect(combobox).toBeFocused();
    await expect(combobox).toHaveValue(prefix);
    await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeVisible();
    await expect(page.getByRole('option').first()).toBeVisible();

    // Traka je skrolovana ispod sticky header-a.
    const headerBox = await page.getByRole('banner').first().boundingBox();
    const inputBox = await combobox.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
  });

  test('razmak i prečice ne fokusiraju pretragu', async ({ page }) => {
    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });

    await page.keyboard.press('Space');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Alt+x');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('F2');

    await expect(combobox).toHaveValue('');
    await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeHidden();
  });

  test('klik na traku van input-a fokusira input', async ({ page }) => {
    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });
    const box = await combobox.boundingBox();
    expect(box).not.toBeNull();

    // Levo od input-a: unutrašnja margina trake i labela „What“.
    await page.mouse.click(box!.x - 8, box!.y + box!.height / 2);

    await expect(combobox).toBeFocused();
  });

  test('lista sa više grupa skroluje do poslednje opcije i klik na nju radi', async ({ page }) => {
    const { prefix } = await prepareBusinesses();

    await page.goto('/');
    await page.getByRole('combobox', { name: 'What' }).fill(prefix);
    const listbox = page.getByRole('listbox', { name: 'Search suggestions' });
    await expect(listbox).toBeVisible();
    await expect(page.getByRole('group', { name: 'Places' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Businesses' })).toBeVisible();

    const options = page.getByRole('option');
    await expect(options).toHaveCount(10);

    // Lista je ograničene visine i skroluje se unutar sebe.
    const popup = page.locator('[data-search-popup]');
    const overflows = await popup.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(overflows).toBe(true);

    const last = options.last();
    const lastName = (await last.textContent()) ?? '';
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await popup.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    await last.click();

    await page.waitForURL((url) => url.pathname.startsWith('/businesses/'));
    await expect(page.getByRole('heading', { level: 1, name: lastName })).toBeVisible();
  });
});
