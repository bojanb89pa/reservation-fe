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
    // `waitUntil: 'commit'` — MyReservationsPage odmah po mount-u (efekat bez
    // čekanja) radi pun redirect na auth-service; podrazumevano `'load'` ume
    // da se otkine (`ERR_ABORTED`) jer taj redirect krene pre nego što
    // Playwright završi da prati 'load' inicijalne SPA navigacije.
    await page.goto('/my-reservations', { waitUntil: 'commit' });
    // `waitUntil: 'commit'` i ovde — auth-service ume da uradi dodatni
    // redirect pre nego što stigne do login forme, pa podrazumevano `'load'`
    // zna da se otkine (`ERR_ABORTED`) usred tog lanca redirect-a.
    await page.waitForURL((url) => url.origin === new URL(env.authUrl).origin, {
      waitUntil: 'commit',
    });

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
    // login formu sa `error` u query stringu (isti signal koji
    // `fetchAccessToken`, fixtures/api.ts, koristi da prepozna neuspelu
    // prijavu) — to je framework-garantovano ponašanje i pouzdan dokaz da je
    // auth-service odbio prijavu i vratio korisnika na formu za novi
    // pokušaj. Tačan izgled vidljive poruke o grešci ne možemo proveriti:
    // auth-service Thymeleaf šablon nije deo ovog repoa niti dostupan van
    // Docker image-a. Prethodna verzija je nagađala `role="alert"` i
    // engleski tekst; CI je pokazao da to ne postoji na formi, pa je
    // uklonjeno — videti `needs_input` u odgovoru agenta za ovaj tiket.
    await expect.poll(() => page.url()).toContain('error');
    await expect(page.locator('form.auth-form')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('posle odjave zaštićena ruta ponovo traži login', async ({ page, user, loginAs }) => {
    await loginAs(user);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL((url) => url.origin === new URL(env.baseUrl).origin);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    await page.goto('/my-reservations', { waitUntil: 'commit' });
    await page.waitForURL((url) => url.origin === new URL(env.authUrl).origin, {
      waitUntil: 'commit',
    });
    await expect(page.locator('form.auth-form')).toBeVisible();
  });
});
