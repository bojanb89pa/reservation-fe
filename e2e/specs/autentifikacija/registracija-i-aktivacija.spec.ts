// E2E-005 · Registracija i aktivacija naloga
//
// /register → mejl sa aktivacionim linkom (Mailpit API) → aktivacija → login.
// Radi samo nad CI stackom sa Mailpit-om, ne nad staging-om.

import { expect, submitLoginForm, test } from '../../fixtures/auth';
import { activateRegisteredUser, uniqueEmail, uniqueName } from '../../fixtures/api';
import { activationLink } from '../../fixtures/mailpit';
import { env } from '../../env';

test.describe('E2E-005 registracija i aktivacija naloga', () => {
  test('registracija šalje aktivacioni mejl; pre aktivacije login ne uspeva, posle aktivacije uspeva', async ({
    page,
    loginAs,
  }) => {
    const credentials = { email: uniqueEmail('aktivacija'), password: env.userPassword };

    await page.goto('/register');
    await page.getByLabel('First name').fill(uniqueName('Ana'));
    await page.getByLabel('Last name').fill('Test');
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // AC: registracija prikazuje poruku da je mejl poslat.
    await expect(page.getByRole('heading', { level: 1, name: 'Check your inbox.' })).toBeVisible();
    await expect(page.getByText(credentials.email)).toBeVisible();

    // AC: mejl stiže u Mailpit i sadrži aktivacioni link (baca grešku ako ne stigne / ne sadrži link).
    await activationLink(credentials.email);

    // AC: pre aktivacije login nije moguć. Spring Security-jev podrazumevani
    // neuspeli login redirect vraća na login formu sa `error` u query stringu
    // — isti generički signal koji `fetchAccessToken` (fixtures/api.ts) i
    // testovi u `prijava-i-odjava.spec.ts` koriste za neuspelu prijavu. Tačan
    // tekst poruke za neaktiviran nalog ne možemo proveriti: auth-service
    // Thymeleaf šablon nije deo ovog repoa niti dostupan van Docker image-a.
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => url.origin === new URL(env.authUrl).origin);
    await submitLoginForm(page, credentials);
    await expect.poll(() => page.url()).toContain('error');
    await expect(page.locator('form.auth-form')).toBeVisible();

    // AC: posle otvaranja linka login uspeva.
    await activateRegisteredUser(credentials.email);
    await loginAs(credentials);
    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
  });

  test('registracija sa već postojećim email-om prikazuje grešku', async ({ page, user }) => {
    await page.goto('/register');
    await page.getByLabel('First name').fill(uniqueName('Marko'));
    await page.getByLabel('Last name').fill('Test');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(env.userPassword);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByTestId('register-error')).toBeVisible();
    await expect(page.getByTestId('register-error')).not.toBeEmpty();
    // I dalje na formi, ne na "mejl je poslat" ekranu.
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });
});
