// E2E-022 · Ponašanje kad BE ne radi
//
// `page.route` simulira 500 i prekid veze (timeout) za listu biznisa, detalj biznisa,
// „Moje rezervacije” i kreiranje rezervacije. Samo pozivi ka resource-service-u
// (`env.apiUrl`) se presreću; OAuth/auth-service ostaje pravi, pa je prijava stvarna.
// Kriterijumi:
//  1. umesto bele strane — poruka o grešci SA mogućnošću ponovnog pokušaja (dugme);
//  2. neuspela rezervacija ne ostavlja korisnika u stanju „učitava se” i prikazuje grešku.

import type { APIResponse, Page, Request, Route } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';
import { env } from '../../env';

type Failure = 'http500' | 'timeout';

const FAILURES: Failure[] = ['http500', 'timeout'];

const LOAD_ERROR = 'load-error';
const RETRY_BUTTON = 'load-error-retry';

interface BusinessDto {
  id: string;
  name: string;
}

interface IdNameDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/** Putanja zahteva ka resource-service-u (bez `/api` prefiksa), ili null ako zahtev nije ka njemu. */
function apiPath(request: Request): string | null {
  const url = request.url();
  if (!url.startsWith(`${env.apiUrl}/`)) return null;
  return new URL(url).pathname.slice(new URL(env.apiUrl).pathname.length);
}

async function fail(route: Route, failure: Failure): Promise<void> {
  if (failure === 'timeout') {
    await route.abort('timedout');
    return;
  }
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ status: 500, error: 'Internal Server Error' }),
  });
}

/** Svaki zahtev ka API-ju čija putanja zadovoljava `matches` (i metod, ako je zadat) pada. */
async function failApi(
  page: Page,
  failure: Failure,
  matches: (path: string) => boolean,
  method?: string,
): Promise<void> {
  await page.route(
    (url) => url.href.startsWith(`${env.apiUrl}/`),
    async (route) => {
      const path = apiPath(route.request());
      const methodOk = !method || route.request().method() === method;
      if (path !== null && methodOk && matches(path)) {
        await fail(route, failure);
        return;
      }
      await route.fallback();
    },
  );
}

function novisadLocation() {
  return {
    name: 'E2E lokacija',
    addressLine1: 'Bulevar oslobođenja 1',
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const accounts = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = accounts.content.find((u) => u.email === email);
  if (!match) throw new Error(`korisnik ${email} nije pronađen u admin pretrazi`);
  return match.id;
}

async function createActiveBusiness(adminApi: ApiClient, ownerId: string): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name: uniqueName('E2E Otpornost'), ownerId, location: novisadLocation() },
  });
  await expectOk(created, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

test.describe('E2E-022 ponašanje kad BE ne radi', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const failure of FAILURES) {
    test(`lista biznisa kategorije: ${failure} prikazuje grešku sa ponovnim pokušajem`, async ({
      page,
      anonymousApi,
    }) => {
      const response = await anonymousApi.get('/business-categories');
      await expectOk(response, 'GET /business-categories');
      const [category] = (await response.json()) as IdNameDto[];
      expect(category, 'seed treba da sadrži bar jednu kategoriju').toBeDefined();

      await failApi(page, failure, (p) => p.startsWith('/businesses'));
      await page.goto(`/businesses/category/${category!.id}`);

      await expect(page.getByTestId(LOAD_ERROR)).toContainText(
        'Failed to load businesses. Please try again.',
      );
      await expect(page.getByTestId(RETRY_BUTTON)).toBeVisible();
    });

    test(`detalj biznisa: ${failure} prikazuje grešku sa ponovnim pokušajem`, async ({ page }) => {
      const owner = await createActivatedUser();
      const adminApi = await ApiClient.as(adminCredentials());
      try {
        const business = await createActiveBusiness(
          adminApi,
          await fetchOwnerId(adminApi, owner.email),
        );

        await failApi(page, failure, (p) => p.startsWith(`/businesses/${business.id}`));
        await page.goto(`/businesses/${business.id}`);

        await expect(page.getByTestId(LOAD_ERROR)).toContainText(
          'This business could not be loaded. Please try again.',
        );
        await expect(page.getByTestId(RETRY_BUTTON)).toBeVisible();
      } finally {
        await adminApi.dispose();
      }
    });

    test(`„Moje rezervacije”: ${failure} prikazuje grešku sa ponovnim pokušajem`, async ({
      page,
      user,
      loginAs,
    }) => {
      await loginAs(user);
      await failApi(page, failure, (p) => p === '/reservations', 'GET');
      await page.goto('/my-reservations');

      await expect(page.getByTestId(LOAD_ERROR)).toContainText(
        'Failed to load your reservations. Please try again.',
      );
      await expect(page.getByTestId(RETRY_BUTTON)).toBeVisible();
    });

    test(`neuspela rezervacija (${failure}) ne ostavlja „Sending…” i prikazuje grešku`, async ({
      page,
      loginAs,
    }) => {
      const owner = await createActivatedUser();
      const customer = await createActivatedUser();
      const adminApi = await ApiClient.as(adminCredentials());
      try {
        const business = await createActiveBusiness(
          adminApi,
          await fetchOwnerId(adminApi, owner.email),
        );
        const serviceRes = await adminApi.post(`/businesses/${business.id}/services`, {
          data: {
            name: uniqueName('E2E Usluga'),
            minDuration: 30,
            maxDuration: 30,
            durationUnit: 'MINUTES',
            durationStep: 15,
          },
        });
        await expectOk(serviceRes, 'POST services');
        const service = (await serviceRes.json()) as IdNameDto;
        const resourceRes = await adminApi.post(`/businesses/${business.id}/resources`, {
          data: { id: null, businessId: business.id, type: 'EMPLOYEE', name: uniqueName('E2E Resurs') },
        });
        await expectOk(resourceRes, 'POST resources');
        const resource = (await resourceRes.json()) as IdNameDto;

        // Svih 7 dana, da ciljni dan ne zavisi od dana u nedelji kad CI radi.
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        for (const dayOfWeek of days) {
          const rule = await adminApi.post(`/resources/${resource.id}/availability-rules`, {
            data: {
              id: null,
              resourceId: resource.id,
              dayOfWeek,
              startTime: '08:00',
              endTime: '20:00',
            },
          });
          await expectOk(rule, 'POST availability-rules');
        }

        await loginAs(customer);
        await failApi(
          page,
          failure,
          (p) => p === `/resources/${resource.id}/reservations`,
          'POST',
        );

        // Prvi dostupan dan i termin: stranica se učitava dok dugme dana ne postane aktivno.
        const dayButtons = page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ });
        await expect(async () => {
          await page.goto(`/businesses/${business.id}`);
          await page
            .getByRole('tab', { name: new RegExp(escapeRegex(service.name)) })
            .click();
          await page
            .getByRole('tab', { name: new RegExp(escapeRegex(resource.name)) })
            .click();
          await expect(dayButtons.first()).toBeEnabled({ timeout: 5_000 });
        }).toPass({ timeout: 60_000, intervals: [1_000] });
        await dayButtons.last().click();
        await page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first().click();

        const confirm = page.getByRole('button', { name: 'Confirm reservation' });
        await confirm.click();

        // Korisnik nije zaglavljen u „Sending…”, ostaje na strani i može ponovo da pokuša.
        await expect(page.getByRole('button', { name: 'Sending…' })).toHaveCount(0);
        await expect(confirm).toBeEnabled();
        await expect(page).not.toHaveURL(/\/held$/);
        // I dobija poruku da rezervacija nije uspela.
        await expect(page.getByRole('alert')).toContainText(
          'Your reservation could not be sent. Please try again.',
        );
      } finally {
        await adminApi.dispose();
      }
    });
  }
});
