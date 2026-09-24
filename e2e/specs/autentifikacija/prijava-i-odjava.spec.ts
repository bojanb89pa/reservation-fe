// E2E-004 · Prijava i odjava
//
// Login kroz pravi OAuth tok (auth-service login forma → /callback) i odjava.
// `/my-reservations` i `/account` nisu iza `ProtectedRoute`-a (taj čuva samo
// `/dashboard/*`); svaka od te dve stranice sama zove `initiateLogin()` kad
// korisnik nije prijavljen, što pamti trenutnu putanju u
// `sessionStorage['auth_return_to']` i posle uspešne prijave vraća korisnika
// na nju (`OAuthCallbackPage`).

import { expect, submitLoginForm, test } from '../../fixtures/auth';
import { uniqueName } from '../../fixtures/api';
import { env } from '../../env';

test.describe('E2E-004 prijava i odjava', () => {
  test('posle login-a korisnik je vraćen u aplikaciju i vidi meni naloga', async ({
    page,
    user,
    loginAs,
  }) => {
    await loginAs(user);

    await expect(page.getByRole('link', { name: 'My account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('otvaranje zaštićene rute bez login-a vodi na login, a posle login-a nazad na tu rutu', async ({
    page,
    user,
  }) => {
    await page.goto('/my-reservations');
    await page.waitForURL((url) => url.origin === new URL(env.authUrl).origin);

    await submitLoginForm(page, user);

    await page.waitForURL(
      (url) => url.origin === new URL(env.baseUrl).origin && url.pathname === '/my-reservations',
    );
    await expect(page.getByRole('heading', { level: 1, name: 'My reservations' })).toBeVisible();
  });

  test('pogrešna lozinka prikazuje grešku na login formi', async ({ page, user }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => url.origin === new URL(env.authUrl).origin);

    await submitLoginForm(page, { email: user.email, password: uniqueName('pogresna-lozinka') });

    // Spring Security-jev podrazumevani neuspeli login redirect vraća na
    // login formu sa `error` u query stringu (isto proveravano u
    // `fetchAccessToken`, fixtures/api.ts) — potvrđuje da prijava nije
    // uspela. Tačan tekst/oblik vidljive poruke o grešci nismo mogli da
    // proverimo (auth-service Thymeleaf šablon nije deo ovog repoa), pa
    // proveravamo najčešći a11y obrazac za takvu poruku.
    // WARNING: pretpostavljen selektor greške na login formi — proveriti u CI logu pre merge-a.
    await expect.poll(() => page.url()).toContain('error');
    await expect(page.locator('form.auth-form')).toBeVisible();
    await expect(
      page.getByRole('alert').or(page.getByText(/invalid|incorrect|bad credentials/i)),
    ).toBeVisible();
  });

  test('posle odjave zaštićena ruta ponovo traži login', async ({ page, user, loginAs }) => {
    await loginAs(user);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL((url) => url.origin === new URL(env.baseUrl).origin);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    await page.goto('/my-reservations');
    await page.waitForURL((url) => url.origin === new URL(env.authUrl).origin);
    await expect(page.locator('form.auth-form')).toBeVisible();
  });
});
