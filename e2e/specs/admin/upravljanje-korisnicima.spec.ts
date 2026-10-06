// E2E-016 · Admin: upravljanje korisnicima
//
// `seed-admin` u /dashboard/users traži korisnika po email-u, otvara detalj,
// menja status (deaktivacija/aktivacija) i pokreće reset lozinke.
// Svaki test pravi sopstvenog korisnika; admin je bootstrap `adminCredentials()`.

import type { Page, Response } from '@playwright/test';
import { expect, submitLoginForm, test } from '../../fixtures/auth';
import {
  adminCredentials,
  createActivatedUser,
  fetchAccessToken,
  uniqueEmail,
  uniqueName,
  type Credentials,
} from '../../fixtures/api';
import { waitForEmailMatching } from '../../fixtures/mailpit';
import { env } from '../../env';

async function openUserDetail(
  page: Page,
  loginAs: (credentials: Credentials) => Promise<void>,
  email: string,
  firstName: string,
) {
  await loginAs(adminCredentials());
  await page.goto('/dashboard/users');
  await page.getByPlaceholder('Search by name or email…').fill(email);
  const row = page.getByRole('row', { name: new RegExp(email) });
  await expect(row).toBeVisible();
  await row.getByRole('link', { name: firstName }).click();
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(firstName) })).toBeVisible();
}

const isStatusPatch = (response: Response) =>
  response.request().method() === 'PATCH' && /\/accounts\/[^/]+\/status$/.test(response.url());

const canLogin = (credentials: Credentials) =>
  fetchAccessToken(credentials).then(
    () => true,
    () => false,
  );

test.describe('E2E-016 admin upravljanje korisnicima', () => {
  test('pretraga po email-u nalazi korisnika i otvara detalj', async ({ page, loginAs }) => {
    const firstName = uniqueName('Pretraga').replace(/\s+/g, '');
    const target = await createActivatedUser({ email: uniqueEmail('pretraga'), firstName });
    await createActivatedUser({
      email: uniqueEmail('drugi'),
      firstName: uniqueName('Drugi').replace(/\s+/g, ''),
    });

    await openUserDetail(page, loginAs, target.email, firstName);
    await expect(page.getByText(target.email, { exact: true })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
  });

  test('deaktiviran korisnik ne može da se prijavi, posle aktivacije može', async ({
    page,
    browser,
    loginAs,
  }) => {
    const firstName = uniqueName('Status').replace(/\s+/g, '');
    const target = await createActivatedUser({ email: uniqueEmail('status'), firstName });

    await openUserDetail(page, loginAs, target.email, firstName);

    const deactivated = page.waitForResponse(isStatusPatch);
    await page.getByRole('button', { name: 'Deactivate' }).click();
    const deactivateResponse = await deactivated;
    expect(deactivateResponse.status(), await deactivateResponse.text()).toBe(200);
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible();

    const blockedContext = await browser.newContext();
    try {
      const blockedPage = await blockedContext.newPage();
      await blockedPage.goto(env.baseUrl);
      await blockedPage.getByRole('button', { name: 'Sign in' }).click();
      await blockedPage.waitForURL((url) => url.origin === new URL(env.authUrl).origin);
      await submitLoginForm(blockedPage, target);
      await expect.poll(() => blockedPage.url()).toContain('error');
      await expect(blockedPage.locator('form.auth-form')).toBeVisible();
    } finally {
      await blockedContext.close();
    }
    expect(await canLogin(target)).toBe(false);

    const activated = page.waitForResponse(isStatusPatch);
    await page.getByRole('button', { name: 'Activate' }).click();
    const activateResponse = await activated;
    expect(activateResponse.status(), await activateResponse.text()).toBe(200);
    await expect(page.getByText('Active', { exact: true })).toBeVisible();

    await expect.poll(() => canLogin(target)).toBe(true);
  });

  test('reset lozinke šalje mejl korisniku i nova lozinka važi', async ({ page, loginAs }) => {
    const firstName = uniqueName('Reset').replace(/\s+/g, '');
    const target = await createActivatedUser({ email: uniqueEmail('reset'), firstName });
    const newPassword = 'E2e-Novi-Passw0rd!';

    await openUserDetail(page, loginAs, target.email, firstName);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await page.getByLabel('New password').fill(newPassword);
    await page.getByLabel('Confirm password').fill(newPassword);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

    // Aktivacioni mejl je već u Mailpit-u; traži se mejl koji nije aktivacioni.
    await waitForEmailMatching(target.email, (m) => !(m.HTML || m.Text).includes('/users/activate'));

    expect(await canLogin(target)).toBe(false);
    await expect.poll(() => canLogin({ email: target.email, password: newPassword })).toBe(true);
  });
});
