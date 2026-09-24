import { test as base, expect, type Page } from '@playwright/test';
import { env } from '../env';
import { ApiClient, createActivatedUser, type Credentials } from './api';

/** Ključ pod kojim FE (`tokenStorage.ts`) čuva access token. */
export const ACCESS_TOKEN_KEY = 'reserva_access_token';

/** Isti URL gradi FE u `redirectToAuthorize()`. */
function buildAuthorizeUrl(): URL {
  const authorizeUrl = new URL(`${env.authUrl}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: env.oauthClientId,
    redirect_uri: env.oauthRedirectUri,
    scope: 'openid profile read write',
  }).toString();
  return authorizeUrl;
}

/**
 * Popunjava i šalje login formu auth-service-a (Thymeleaf šablon, ne FE;
 * id-jevi su tamo stabilni, a tekst labela zavisi od jezika iz kolačića). Ne
 * čeka uspešnu prijavu — pozivalac odlučuje šta sledeće očekuje (uspeh ili
 * grešku na formi).
 */
export async function submitLoginForm(page: Page, credentials: Credentials): Promise<void> {
  await page.locator('#username').fill(credentials.email);
  await page.locator('#password').fill(credentials.password);
  await page.locator('form.auth-form button[type="submit"]').click();
}

/**
 * Prijava kroz pravi OAuth tok u browseru: authorize → login forma
 * auth-service-a → /callback na FE-u → FE razmeni code za token.
 */
export async function loginInBrowser(page: Page, credentials: Credentials): Promise<void> {
  await page.goto(buildAuthorizeUrl().toString());
  await submitLoginForm(page, credentials);

  await page.waitForURL((url) => url.origin === new URL(env.baseUrl).origin && !url.pathname.startsWith('/callback'));
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), ACCESS_TOKEN_KEY), {
      message: 'FE nije sačuvao access token posle OAuth callback-a',
    })
    .not.toBeNull();
}

interface E2EFixtures {
  /** Nov, aktiviran korisnik samo za ovaj test (radi samo nad CI stackom sa Mailpit-om). */
  user: Credentials;
  /** Prijava u browseru za bilo koji nalog. */
  loginAs: (credentials: Credentials) => Promise<void>;
  /** API klijent bez tokena. */
  anonymousApi: ApiClient;
}

/**
 * `import { test, expect } from '../fixtures/auth'` umesto iz
 * `@playwright/test`, da testovi dobiju `user`, `loginAs` i `anonymousApi`.
 */
export const test = base.extend<E2EFixtures>({
  user: async ({}, use) => {
    await use(await createActivatedUser());
  },
  loginAs: async ({ page }, use) => {
    await use((credentials) => loginInBrowser(page, credentials));
  },
  anonymousApi: async ({}, use) => {
    const api = await ApiClient.anonymous();
    await use(api);
    await api.dispose();
  },
});

export { expect };
