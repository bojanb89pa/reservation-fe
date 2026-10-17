// Naslovna: 3D hero scena vođena skrolom (desktop). Testovi ne zavise od sadržaja canvas-a
// (headless runner može, ali ne mora, da ima WebGL): proveravaju ponašanje koje važi i sa scenom
// i bez nje — pretraga je upotrebljiva od učitavanja, skrol kroz hero stiže do kategorija i
// kucanje bez klika otvara predloge ispod header-a.

import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface PageResponseDto<T> {
  content: T[];
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/** Skuplja neuhvaćene greške stranice i `console.error` (bez grešaka učitavanja resursa i WebGL-a). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/Failed to load resource|WebGL/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

/** Kucanje, brisanje i lepljenje (skok od više karaktera) u polju pretrage. */
async function typeDeletePaste(page: Page): Promise<void> {
  const combobox = page.getByRole('combobox', { name: 'What' });
  await expect(combobox).toBeVisible();
  await combobox.click();
  await page.keyboard.type('abc');
  await expect(combobox).toHaveValue('abc');
  await page.keyboard.press('Backspace');
  await expect(combobox).toHaveValue('ab');
  await page.keyboard.press('Delete');
  await combobox.fill('pasted value');
  await expect(combobox).toHaveValue('pasted value');
  await combobox.fill('');
  await expect(combobox).toHaveValue('');
}

/** Pravi jedan aktivan biznis sa jedinstvenim prefiksom u nazivu i vraća prefiks. */
async function prepareBusiness(): Promise<string> {
  const prefix = uniqueName('Hero');
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

    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: `${prefix} biznis`,
        ownerId,
        location: {
          name: 'E2E lokacija',
          addressLine1: 'Bulevar oslobođenja 1',
          city: `${prefix} grad`,
          postalCode: '21000',
          countryCode: 'RS',
          latitude: 45.2671,
          longitude: 19.8335,
        },
      },
    });
    await expectOk(created, 'POST /businesses/admin');
    return prefix;
  } finally {
    await adminApi.dispose();
  }
}

test.describe('Naslovna: hero na desktop viewport-u', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('naslov i traka pretrage su vidljivi i upotrebljivi od učitavanja @smoke', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const combobox = page.getByRole('combobox', { name: 'What' });
    await expect(combobox).toBeVisible();
    await expect(combobox).toBeEnabled();
    await combobox.click();
    await expect(combobox).toBeFocused();
  });

  test('skrol kroz hero stiže do kategorija, a skrol nagore vraća na vrh @smoke', async ({
    page,
  }) => {
    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });
    await expect(combobox).toBeVisible();

    const categoryTitle = page.getByRole('heading', { name: 'Pick a category to begin.' });
    await categoryTitle.scrollIntoViewIfNeeded();
    await expect(categoryTitle).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(combobox).toBeInViewport();
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  });

  test('kucanje, brisanje i lepljenje u traci rade bez grešaka u konzoli @smoke', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await typeDeletePaste(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('kucanje bez klika otvara predloge cele ispod header-a', async ({ page }) => {
    const prefix = await prepareBusiness();

    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });
    await expect(combobox).toBeVisible();
    await expect(combobox).not.toBeFocused();

    await page.keyboard.type(prefix);

    await expect(combobox).toBeFocused();
    await expect(combobox).toHaveValue(prefix);
    const listbox = page.getByRole('listbox', { name: 'Search suggestions' });
    await expect(listbox).toBeVisible();
    await expect(page.getByRole('option').first()).toBeVisible();

    const headerBox = await page.getByRole('banner').first().boundingBox();
    const inputBox = await combobox.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
    await expect(listbox).toBeInViewport();
  });
});

test.describe('Naslovna: hero na telefonu', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('nema 3D scene: nema canvas-a, pretraga je upotrebljiva @smoke', async ({ page }) => {
    await page.goto('/');

    const combobox = page.getByRole('combobox', { name: 'What' });
    await expect(combobox).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Pick a category to begin.' })).toBeAttached();
  });

  test('kucanje, brisanje i lepljenje rade bez grešaka u konzoli @smoke', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await typeDeletePaste(page);
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('Naslovna: promena teme sa hero scenom', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('prelaz svetla/tamna tema ne pravi scenu ponovo i ne baca greške, kucanje radi u obe @smoke', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    const combobox = page.getByRole('combobox', { name: 'What' });
    await expect(combobox).toBeVisible();

    const canvas = page.locator('canvas');
    const hasCanvas = (await canvas.count()) > 0;
    if (hasCanvas) {
      await canvas.first().evaluate((el) => el.setAttribute('data-e2e-marker', 'hero-canvas'));
    }

    const html = page.locator('html');
    const initial = (await html.getAttribute('data-theme')) === 'light' ? 'light' : 'dark';
    const other = initial === 'light' ? 'dark' : 'light';
    const toggleName = (to: string) =>
      to === 'light' ? 'Switch to light mode' : 'Switch to dark mode';

    await page.getByRole('button', { name: toggleName(other) }).first().click();
    await expect(html).toHaveAttribute('data-theme', other);
    await typeDeletePaste(page);

    await page.getByRole('button', { name: toggleName(initial) }).first().click();
    await expect(html).toHaveAttribute('data-theme', initial);
    await typeDeletePaste(page);

    if (hasCanvas) {
      await expect(page.locator('canvas[data-e2e-marker="hero-canvas"]')).toHaveCount(1);
    }
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('Naslovna: bez scene (reduced-motion)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

  test('nema canvas-a, kucanje radi isto i nema grešaka u konzoli @smoke', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByRole('combobox', { name: 'What' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await typeDeletePaste(page);
    expect(errors).toEqual([]);
  });
});
