import { ApiClient } from '../fixtures/api';
import { ACCESS_TOKEN_KEY, expect, test } from '../fixtures/auth';

// Provera samog skeleta: da stack ustaje i da fixture-i rade. Pravi tokovi
// su u docs/e2e-backlog.md (reservation-agents) i pišu ih agenti.

test('početna strana se otvara @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('#root')).not.toBeEmpty();
});

test('fixture: registracija, aktivacija i prijava kroz OAuth', async ({ page, user, loginAs }) => {
  await loginAs(user);
  const token = await page.evaluate((key) => localStorage.getItem(key), ACCESS_TOKEN_KEY);
  expect(token).toBeTruthy();
});

test('fixture: API token bez browsera', async ({ user }) => {
  const api = await ApiClient.as(user);
  try {
    const response = await api.get('/business-categories');
    expect(response.ok()).toBe(true);
  } finally {
    await api.dispose();
  }
});
