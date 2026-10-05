// Ponovljen #32 · Istekla sesija ne sme da uđe u petlju /oauth2/authorize → /callback
//
// Pravi Google login ne može da se automatizuje, ali bug nije specifičan za
// Google: okida ga zaostalo `isAuthenticated: true` u localStorage ključu
// `reserva-auth` kad tokena više nema. Zato se koristi klasična prijava, pa se
// istekla sesija simulira (tokeni obrisani ili istekli, kolačići auth-service-a
// obrisani da bi se ponovo pojavila login forma), a `reserva-auth` ostaje netaknut.
// `/my-reservations` sama zove `initiateLogin()` kad korisnik nije prijavljen.

import type { Page } from '@playwright/test';
import { ACCESS_TOKEN_KEY, expect, submitLoginForm, test } from '../../fixtures/auth';
import type { Credentials } from '../../fixtures/api';
import { env } from '../../env';

const REFRESH_TOKEN_KEY = 'reserva_refresh_token';
const AUTH_STORE_KEY = 'reserva-auth';

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** JWT čiji je `exp` u prošlosti; potpis nije bitan jer ga FE ne proverava. */
function expiredJwt(): string {
  const past = Math.floor(Date.now() / 1000) - 3600;
  const header = base64Url({ alg: 'none', typ: 'JWT' });
  const payload = base64Url({ sub: 'expired', exp: past });
  return [header, payload, 'sig'].join('.');
}

interface Recorder {
  /** Redosled relevantnih događaja: 'authorize', 'callback', 'me-401'. */
  events: string[];
}

function record(page: Page): Recorder {
  const events: string[] = [];
  const authOrigin = new URL(env.authUrl).origin;
  const baseOrigin = new URL(env.baseUrl).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === authOrigin && url.pathname.endsWith('/oauth2/authorize')) {
      events.push('authorize');
    }
    if (request.isNavigationRequest() && url.origin === baseOrigin && url.pathname === '/callback') {
      events.push('callback');
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.endsWith('/businesses/me') && response.status() === 401) {
      events.push('me-401');
    }
  });
  return { events };
}

async function expectLoggedInOnce(page: Page, recorder: Recorder): Promise<void> {
  await page.waitForURL(
    (url) => url.origin === new URL(env.baseUrl).origin && url.pathname === '/my-reservations',
  );
  await expect(page.getByRole('heading', { level: 1, name: 'My reservations' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), ACCESS_TOKEN_KEY))
    .not.toBeNull();

  expect(recorder.events.filter((e) => e === 'callback')).toHaveLength(1);
  expect(recorder.events).not.toContain('me-401');
  // Posle callback-a nema novog zahteva ka /oauth2/authorize.
  const afterCallback = recorder.events.slice(recorder.events.indexOf('callback') + 1);
  expect(afterCallback).not.toContain('authorize');
}

async function expireSession(page: Page, prepareTokens: () => Promise<void>): Promise<void> {
  await page.context().clearCookies();
  await prepareTokens();
  const authStore = await page.evaluate((key) => localStorage.getItem(key), AUTH_STORE_KEY);
  expect(authStore, 'zaostalo stanje reserva-auth mora ostati').toContain('"isAuthenticated":true');
}

async function signInAfterExpiry(page: Page, user: Credentials): Promise<void> {
  // Pun redirect na auth-service iz React efekta — vidi komentar u prijava-i-odjava.spec.ts.
  await page.goto('/my-reservations', { waitUntil: 'commit' });
  await submitLoginForm(page, user);
}

test.describe('Ponovljen #32 istekla sesija', () => {
  test('obrisani tokeni a zaostali reserva-auth: jedan callback, bez 401 i bez nove petlje', async ({
    page,
    user,
    loginAs,
  }) => {
    await loginAs(user);
    await expireSession(page, () =>
      page.evaluate(
        (keys) => {
          localStorage.removeItem(keys.access);
          localStorage.removeItem(keys.refresh);
        },
        { access: ACCESS_TOKEN_KEY, refresh: REFRESH_TOKEN_KEY },
      ),
    );

    const recorder = record(page);
    await signInAfterExpiry(page, user);
    await expectLoggedInOnce(page, recorder);
  });

  test('istekli access token bez refresh tokena: jedan callback, bez 401 i bez nove petlje', async ({
    page,
    user,
    loginAs,
  }) => {
    await loginAs(user);
    const expired = expiredJwt();
    await expireSession(page, () =>
      page.evaluate(
        (arg) => {
          localStorage.setItem(arg.access, arg.token);
          localStorage.removeItem(arg.refresh);
        },
        { access: ACCESS_TOKEN_KEY, refresh: REFRESH_TOKEN_KEY, token: expired },
      ),
    );

    const recorder = record(page);
    await signInAfterExpiry(page, user);
    await expectLoggedInOnce(page, recorder);
  });
});
