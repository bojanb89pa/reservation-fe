// epic:27 · E2E za FE widget za rezervacije
//
// Kontrolni tiket (bojanb89pa/reservation-agents#27) traži: (1) ugrađiv FE
// widget koji spoljni sajtovi koriste preko npm paketa, (2) mogućnost da
// klijent widgeta prilagodi CSS/temu (light/dark), (3) BE spremnu za
// rezervacije koje prave klijentske aplikacije za svoje (ne-Reserva) korisnike,
// bez javnog (public) pristupa.
//
// Slojevi epica (#124 ui, #123 application, #122 infrastructure, #120 api) su
// isporučili samo admin ekran za registraciju klijentskih aplikacija
// (`POST /api/admin/client-applications` — naziv + opseg: jedna lokacija /
// više lokacija istog biznisa / cela kategorija) i BE ugovor za taj endpoint.
// Ne postoji nikakav embed-ovani widget, npm paket, build target za spoljnu
// upotrebu ni CSS/tema override bilo gde u repou — `BookingWidget.tsx` je
// interna komponenta glavne Reserva app-e (koristi je `BusinessDetailPage`),
// nije nešto što spoljni sajt može da ubaci. Zato kriterijumi (1) i (2) nisu
// pokriveni testovima ispod — nemaju šta da se testira, to je nalaz za
// `needs_input`, ne nedostatak testa.
//
// `POST /api/client-applications/reservations` (deo kriterijuma 3 — sama
// rezervacija preko klijentske aplikacije) postoji na BE-u, ali fe-brief
// (logs/fe-brief-api-resource-service-endpoint-i-za-registraciju-klijentskih-
// aplikacija-20260925-230304.md) izričito kaže da nije proverljiv end-to-end:
// auth-service još ne izdaje token klijentskoj aplikaciji (JWT sa
// `ClientApplicationPrincipal`-om), pa ne postoji način da E2E test dobije
// validan token za taj endpoint. Testovi ispod pokrivaju ono što jeste
// isporučeno i proverljivo: admin registraciju klijentske aplikacije (sva tri
// oblika opsega) kroz UI, autorizacioni gejt (samo admin), i BE ugovor
// (401/403/400/200) direktno kroz API.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface LocationDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

interface ClientApplicationScopeDto {
  type: string;
  [key: string]: unknown;
}

interface ClientApplicationResponseDto {
  id: string;
  name: string;
  scope: ClientApplicationScopeDto;
  enabled: boolean;
}

/** `expect(status)` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  expect(
    response.status(),
    `${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`,
  ).toBe(expected);
}

/**
 * `POST /businesses/admin` traži pravi `User.id`, ne JWT `sub` claim — čita se
 * preko admin pretrage naloga (isto kao u prazan-naziv-lokacije.spec.ts).
 */
async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectStatus(response, 200, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

function uniqueLocationPayload() {
  return {
    name: uniqueName('Lokacija'),
    addressLine1: uniqueName('Ulica'),
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

/** Aktivan biznis sa jednom lokacijom (admin kreacija je odmah aktivna, videti E2E-001). */
async function createActiveBusiness(
  adminApi: ApiClient,
  ownerId: string,
  namePrefix: string,
): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name: uniqueName(namePrefix), ownerId, location: uniqueLocationPayload() },
  });
  await expectStatus(created, 200, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

async function addLocation(ownerApi: ApiClient, businessId: string): Promise<LocationDto> {
  const response = await ownerApi.post(`/businesses/${businessId}/locations`, {
    data: uniqueLocationPayload(),
  });
  await expectStatus(response, 200, `POST /businesses/${businessId}/locations`);
  return (await response.json()) as LocationDto;
}

/** Sopstvena top-level kategorija (jedinstven kod/naziv), da test ne deli seed kategorije sa drugima. */
async function createUniqueCategory(adminApi: ApiClient): Promise<{ id: string; name: string }> {
  const name = uniqueName('Kategorija za widget');
  const code = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const created = await adminApi.post('/business-categories', {
    data: { code, translations: { en: name, sr: name } },
  });
  await expectStatus(created, 200, 'POST /business-categories');
  return (await created.json()) as { id: string; name: string };
}

test.describe('epic:27 admin registruje klijentsku aplikaciju kroz dashboard', () => {
  test('opseg: jedna lokacija', async ({ page, loginAs }) => {
    const admin = adminCredentials();
    const adminApi = await ApiClient.as(admin);
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const business = await createActiveBusiness(adminApi, ownerId, 'E2E Widget SL');

      await loginAs(admin);
      await page.goto('/dashboard/client-applications');
      await expect(page.getByRole('heading', { level: 1, name: 'Client applications' })).toBeVisible();

      const appName = uniqueName('Widget aplikacija SL');
      await page.getByLabel('Application name').fill(appName);
      await expect(page.getByRole('radio', { name: 'Single location' })).toBeChecked();

      await page.getByLabel('Business').selectOption({ label: business.name });
      const locationSelect = page.getByLabel('Location');
      await expect(locationSelect.locator('option')).toHaveCount(2); // placeholder + naša lokacija
      await locationSelect.selectOption({ index: 1 });

      await page.getByRole('button', { name: 'Register application' }).click();

      const result = page.getByRole('status');
      await expect(result).toContainText('Client application registered');
      await expect(result).toContainText('Yes'); // Enabled
    } finally {
      await adminApi.dispose();
    }
  });

  test('opseg: više lokacija istog biznisa', async ({ page, loginAs }) => {
    const admin = adminCredentials();
    const adminApi = await ApiClient.as(admin);
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const business = await createActiveBusiness(adminApi, ownerId, 'E2E Widget ML');
      const secondLocation = await addLocation(ownerApi, business.id);

      await loginAs(admin);
      await page.goto('/dashboard/client-applications');

      const appName = uniqueName('Widget aplikacija ML');
      await page.getByLabel('Application name').fill(appName);
      await page.getByRole('radio', { name: 'Multiple locations' }).check();

      await page.getByLabel('Business').selectOption({ label: business.name });
      await expect(page.getByRole('checkbox')).toHaveCount(2);
      await page.getByRole('checkbox', { name: secondLocation.name }).check();
      // Ostavljamo samo jednu čekiranu — forma ne zahteva sve, samo bar jednu.

      await expect(page.getByRole('button', { name: 'Register application' })).toBeEnabled();
      await page.getByRole('button', { name: 'Register application' }).click();

      const result = page.getByRole('status');
      await expect(result).toContainText('Client application registered');
    } finally {
      await adminApi.dispose();
      await ownerApi.dispose();
    }
  });

  test('opseg: cela kategorija', async ({ page, loginAs }) => {
    const admin = adminCredentials();
    const adminApi = await ApiClient.as(admin);
    try {
      const category = await createUniqueCategory(adminApi);

      await loginAs(admin);
      await page.goto('/dashboard/client-applications');

      const appName = uniqueName('Widget aplikacija kategorija');
      await page.getByLabel('Application name').fill(appName);
      await page.getByRole('radio', { name: 'Business category' }).check();

      await page.getByLabel('Category').selectOption({ label: category.name });
      await page.getByRole('button', { name: 'Register application' }).click();

      const result = page.getByRole('status');
      await expect(result).toContainText('Client application registered');
    } finally {
      await adminApi.dispose();
    }
  });

  test('korisnik koji nije admin ne može da otvori ekran za klijentske aplikacije', async ({
    page,
    loginAs,
  }) => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      // Vlasnik mora imati aktivan biznis, inače DashboardLayout ionako šalje na
      // /business-onboarding pre nego što AdminRoute stigne da odluči — ovim
      // izolujemo baš admin-only gejt, ne opšte pravilo o onboardingu.
      await createActiveBusiness(adminApi, ownerId, 'E2E Widget non-admin');

      await loginAs(owner);
      await page.goto('/dashboard/client-applications');

      await page.waitForURL((url) => url.pathname === '/dashboard');
      await expect(page.getByRole('link', { name: 'Client applications' })).not.toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });
});

test.describe('epic:27 BE ugovor POST /admin/client-applications', () => {
  test('401 bez tokena, 403 za običnog korisnika, 400 za nevalidno telo', async ({
    anonymousApi,
  }) => {
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const anyLocationId = crypto.randomUUID();
      const validBody = { name: uniqueName('Widget BE'), scope: { type: 'SINGLE_LOCATION', locationId: anyLocationId } };

      const withoutToken = await anonymousApi.post('/admin/client-applications', { data: validBody });
      await expectStatus(withoutToken, 401, 'POST /admin/client-applications (bez tokena)');

      const asNonAdmin = await ownerApi.post('/admin/client-applications', { data: validBody });
      await expectStatus(asNonAdmin, 403, 'POST /admin/client-applications (običan korisnik)');

      const blankName = await adminApi.post('/admin/client-applications', {
        data: { name: '', scope: { type: 'SINGLE_LOCATION', locationId: anyLocationId } },
      });
      await expectStatus(blankName, 400, 'POST /admin/client-applications (prazan naziv)');

      const unknownScopeType = await adminApi.post('/admin/client-applications', {
        data: { name: uniqueName('Widget BE'), scope: { type: 'NOT_A_REAL_SCOPE' } },
      });
      await expectStatus(
        unknownScopeType,
        400,
        'POST /admin/client-applications (nepoznat scope.type)',
      );
    } finally {
      await ownerApi.dispose();
      await adminApi.dispose();
    }
  });

  test('200 sa admin tokenom vraća ClientApplicationResponse koji odražava poslati opseg', async () => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const business = await createActiveBusiness(adminApi, ownerId, 'E2E Widget BE 200');
      const locations = await adminApi.get(`/businesses/${business.id}/locations`);
      await expectStatus(locations, 200, `GET /businesses/${business.id}/locations`);
      const [location] = (await locations.json()) as LocationDto[];
      if (!location) throw new Error('očekivana bar jedna lokacija na novom biznisu');

      const name = uniqueName('Widget BE 200');
      const created = await adminApi.post('/admin/client-applications', {
        data: { name, scope: { type: 'SINGLE_LOCATION', locationId: location.id } },
      });
      await expectStatus(created, 200, 'POST /admin/client-applications');
      const body = (await created.json()) as ClientApplicationResponseDto;

      expect(body.id).toBeTruthy();
      expect(body.name).toBe(name);
      expect(body.enabled).toBe(true);
      expect(body.scope).toEqual({ type: 'SINGLE_LOCATION', locationId: location.id });
    } finally {
      await adminApi.dispose();
    }
  });
});
