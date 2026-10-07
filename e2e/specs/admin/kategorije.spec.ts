// E2E-017 · Admin: kategorije
//
// `seed-admin` u /dashboard/categories menja prevod, boju i simbol kategorije
// koju je test sam napravio (`POST /business-categories`). Kategorije iz
// migracija se ne diraju — drugi testovi paralelno čitaju njihove nazive.

import type { APIResponse, Response } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, uniqueName } from '../../fixtures/api';

interface BusinessCategoryDto {
  id: string;
  name: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectOk(response: APIResponse | Response, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

test.describe('E2E-017 admin kategorije', () => {
  test('izmena prevoda, boje i simbola se vidi na početnoj i kartici, pa se kategorija briše', async ({
    page,
    loginAs,
    anonymousApi,
  }) => {
    const enName = uniqueName('E2E Kategorija');
    const srName = uniqueName('E2E Kategorija sr');
    const newSrName = uniqueName('E2E Kategorija izmenjena');
    const symbol = '🦄';
    const color = '#1e90ff';
    const colorRgb = 'rgb(30, 144, 255)';

    const adminApi = await ApiClient.as(adminCredentials());
    let categoryId: string | undefined;
    let deletedInUi = false;
    try {
      const created = await adminApi.post('/business-categories', {
        data: {
          code: `e2e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          translations: { en: enName, sr: srName },
        },
      });
      await expectOk(created, 'POST /business-categories');
      categoryId = ((await created.json()) as BusinessCategoryDto).id;

      await loginAs(adminCredentials());
      await page.goto('/dashboard/categories');
      const row = page.getByTestId('category-row').filter({ hasText: enName });
      await expect(row).toBeVisible();

      // Prevod: srpski naziv se menja, engleski ostaje.
      await row.getByRole('button', { name: 'Edit' }).click();
      await page.getByLabel('Serbian', { exact: true }).fill(newSrName);
      const updateResponse = page.waitForResponse(
        (r) => r.request().method() === 'PUT' && r.url().endsWith(`/business-categories/${categoryId}`),
      );
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expectOk(await updateResponse, 'PUT /business-categories/{id}');
      await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);

      // Izgled: simbol i boja.
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Appearance' }).click();
      await page.getByLabel('Symbol', { exact: true }).fill(symbol);
      await page.getByLabel('Color', { exact: true }).fill(color);
      const appearanceResponse = page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          r.url().endsWith(`/business-categories/${categoryId}/appearance`),
      );
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expectOk(await appearanceResponse, 'PATCH /business-categories/{id}/appearance');

      // Kartica kategorije u dashboard-u prikazuje novi simbol i boju.
      await expect(row.getByText(symbol)).toBeVisible();
      await expect(row.getByText(symbol)).toHaveCSS('color', colorRgb);

      // Početna na srpskom: novi prevod, simbol i boja.
      await page.evaluate(() => localStorage.setItem('lang', 'sr'));
      await page.goto('/');
      const srCard = page.getByRole('button', { name: new RegExp(escapeRegex(newSrName)) });
      await expect(srCard).toBeVisible();
      await expect(srCard.getByText(symbol)).toHaveCSS('color', colorRgb);
      await expect(
        page.getByRole('button', { name: new RegExp(escapeRegex(srName)) }),
      ).toHaveCount(0);

      // Početna na engleskom: engleski naziv je ostao isti.
      await page.evaluate(() => localStorage.setItem('lang', 'en'));
      await page.goto('/');
      await expect(
        page.getByRole('button', { name: new RegExp(escapeRegex(enName)) }),
      ).toBeVisible();

      // Brisanje kategorije kroz UI.
      await page.goto('/dashboard/categories');
      await page
        .getByTestId('category-row')
        .filter({ hasText: enName })
        .getByRole('button', { name: 'Delete' })
        .click();
      const deleteResponse = page.waitForResponse(
        (r) => r.request().method() === 'DELETE' && r.url().endsWith(`/business-categories/${categoryId}`),
      );
      await page
        .getByTestId('category-delete-dialog')
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
      await expectOk(await deleteResponse, 'DELETE /business-categories/{id}');
      deletedInUi = true;
      await expect(page.getByTestId('category-row').filter({ hasText: enName })).toHaveCount(0);

      const listed = await anonymousApi.get('/business-categories', {
        headers: { 'Accept-Language': 'en' },
      });
      await expectOk(listed, 'GET /business-categories');
      const names = ((await listed.json()) as BusinessCategoryDto[]).map((c) => c.name);
      expect(names).not.toContain(enName);
    } finally {
      // Ako test padne pre brisanja kroz UI, kategorija ne sme da ostane u bazi.
      if (categoryId && !deletedInUi) {
        await adminApi.delete(`/business-categories/${categoryId}`);
      }
      await adminApi.dispose();
    }
  });
});
