// E2E-006 · Rezervacija termina
//
// Biznis, uslugu (30min, fiksno trajanje), resurs i pravilo dostupnosti
// (ceo dan) svaki test pravi sam preko admin API-ja — isti obrazac kao u
// E2E-001 (pregled-kategorija-i-biznisa.spec.ts): `POST /businesses/admin`
// je odmah aktivan biznis, admin nalog sme i da doda uslugu/resurs/pravilo.
// Ciljni dan je nekoliko dana unapred (ne "danas", da izbegnemo granicu
// prošlo/buduće vreme u toku dana) i pravilo dostupnosti pokriva tačno taj
// dan u nedelji (08:00–20:00), pa je 08:00 uvek prvi slobodan termin.
//
// NALAZI (testovi ispod ih tačno proveravaju, pa mogu pasti na CI):
// - `ReservationHeldPage` (modules/ui/src/pages/ReservationHeldPage.tsx) ne
//   prikazuje naziv usluge — samo biznis, resurs, vreme i kod potvrde. AK-006-2
//   traži "detalje (biznis, usluga, vreme)".
// - `BusinessDetailPage.handleConfirm` (modules/ui/src/pages/BusinessDetailPage.tsx,
//   oko linije 47-51) za neulogovanog korisnika radi `navigate('/')` umesto
//   `initiateLogin()` (obrazac iz `MyReservationsPage.tsx`) — korisnik ostaje
//   na početnoj, ne ide na login formu auth-service-a.

import type { APIResponse, Page } from '@playwright/test';
import { expect, test, loginInBrowser } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

const DAYS_ORDERED: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Isti tekst kao `PENDING_TOOLTIP` u `BookingWidget.tsx` — termin na koji je već poslat zahtev. */
const PENDING_TOOLTIP =
  'Someone has requested this — yours will be considered if theirs is rejected.';

interface BusinessDto {
  id: string;
  name: string;
}

interface BusinessServiceDto {
  id: string;
  name: string;
}

interface ResourceDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `expect(res.ok())` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/**
 * Lokacija sa svim obaveznim poljima iz BE `CreateBusinessLocationRequest` (name, latitude,
 * longitude) — videti E2E-001 (pregled-kategorija-i-biznisa.spec.ts) za detalje.
 */
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

// `createActivatedUser()` ne vraća id korisnika, pa se ownerId čita preko admin pretrage naloga.
async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

/** Aktivan biznis (admin kreacija je odmah aktivna). */
async function createActiveBusiness(
  adminApi: ApiClient,
  ownerId: string,
  name: string,
): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name, ownerId, location: novisadLocation() },
  });
  await expectOk(created, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

/** Usluga fiksnog trajanja od 30min, korak termina 15min. */
async function createFixedService(
  adminApi: ApiClient,
  businessId: string,
  name: string,
): Promise<BusinessServiceDto> {
  const created = await adminApi.post(`/businesses/${businessId}/services`, {
    data: { name, minDuration: 30, maxDuration: 30, durationUnit: 'MINUTES', durationStep: 15 },
  });
  await expectOk(created, `POST /businesses/${businessId}/services`);
  return (await created.json()) as BusinessServiceDto;
}

async function createResource(
  adminApi: ApiClient,
  businessId: string,
  name: string,
): Promise<ResourceDto> {
  const created = await adminApi.post(`/businesses/${businessId}/resources`, {
    data: { id: null, businessId, type: 'EMPLOYEE', name },
  });
  await expectOk(created, `POST /businesses/${businessId}/resources`);
  return (await created.json()) as ResourceDto;
}

/** Pravilo dostupnosti 08:00–20:00 za zadati dan u nedelji. */
async function createAllDayAvailability(
  adminApi: ApiClient,
  resourceId: string,
  dayOfWeek: DayOfWeek,
): Promise<void> {
  const created = await adminApi.post(`/resources/${resourceId}/availability-rules`, {
    data: { id: null, resourceId, dayOfWeek, startTime: '08:00', endTime: '20:00' },
  });
  await expectOk(created, `POST /resources/${resourceId}/availability-rules`);
}

interface TargetDate {
  dateStr: string;
  /** Tekst dugmeta dana u kalendaru (BookingWidget prikazuje samo broj dana). */
  dayLabel: string;
  dayOfWeek: DayOfWeek;
  needsNextMonth: boolean;
}

/**
 * Par dana unapred (van "danas", da termini ne zavise od doba dana kad CI radi),
 * eventualno u narednom mesecu ako je danas pri kraju meseca.
 */
function computeTargetDate(daysAhead: number): TargetDate {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setDate(target.getDate() + daysAhead);
  const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const jsDay = target.getDay(); // 0=nedelja..6=subota
  const dayOfWeek = DAYS_ORDERED[(jsDay + 6) % 7]!;
  const needsNextMonth =
    target.getMonth() !== today.getMonth() || target.getFullYear() !== today.getFullYear();
  return { dateStr, dayLabel: String(target.getDate()), dayOfWeek, needsNextMonth };
}

interface BookableBusiness {
  business: BusinessDto;
  service: BusinessServiceDto;
  resource: ResourceDto;
  target: TargetDate;
}

async function createBookableBusiness(
  adminApi: ApiClient,
  ownerId: string,
): Promise<BookableBusiness> {
  const target = computeTargetDate(2);
  const business = await createActiveBusiness(adminApi, ownerId, uniqueName('E2E Rezervacija'));
  const service = await createFixedService(adminApi, business.id, uniqueName('E2E Usluga'));
  const resource = await createResource(adminApi, business.id, uniqueName('E2E Resurs'));
  await createAllDayAvailability(adminApi, resource.id, target.dayOfWeek);
  return { business, service, resource, target };
}

/** Izbor usluge, resursa i ciljnog dana na javnom detalju biznisa — do prikaza slobodnih termina. */
async function openDayWithSlots(page: Page, ctx: BookableBusiness): Promise<void> {
  await page.goto(`/businesses/${ctx.business.id}`);
  await page.getByRole('tab', { name: new RegExp(escapeRegex(ctx.service.name)) }).click();
  await page.getByRole('tab', { name: new RegExp(escapeRegex(ctx.resource.name)) }).click();
  if (ctx.target.needsNextMonth) {
    await page.getByRole('button', { name: 'Next month' }).click();
  }
  await page.getByRole('button', { name: ctx.target.dayLabel, exact: true }).click();
}

/** Ceo tok rezervacije: bira prvi termin (08:00) i potvrđuje, do hold strane. */
async function reserveFirstSlot(page: Page, ctx: BookableBusiness): Promise<void> {
  await openDayWithSlots(page, ctx);
  await page.getByRole('button', { name: '08:00', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reservation' }).click();
  await page.waitForURL(/\/reservation\/[^/]+\/held$/);
}

test.describe('E2E-006 rezervacija termina', () => {
  test('slobodni termini se prikazuju za izabranu uslugu i dan', async ({ page }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);

      await openDayWithSlots(page, ctx);

      await expect(page.getByRole('button', { name: '08:00', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '08:15', exact: true })).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('izbor termina vodi na hold stranu sa detaljima o biznisu, usluzi i terminu', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);

      await loginAs(customer);
      await reserveFirstSlot(page, ctx);

      await expect(page.getByText(new RegExp(escapeRegex(ctx.business.name)))).toBeVisible();
      // NALAZ: ReservationHeldPage ne prikazuje naziv usluge (samo biznis/resurs/vreme).
      await expect(page.getByText(new RegExp(escapeRegex(ctx.service.name)))).toBeVisible();
      await expect(page.getByText(/08:00/)).toBeVisible();
      await expect(page.getByText(/08:30/)).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('posle potvrde rezervacija je u „Moje rezervacije” sa ispravnim podacima', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);

      await loginAs(customer);
      await reserveFirstSlot(page, ctx);

      await page.goto('/my-reservations');

      await expect(page.getByText(ctx.business.name)).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegex(ctx.service.name)))).toBeVisible();
      await expect(page.getByText(ctx.resource.name)).toBeVisible();
      await expect(page.getByText('Pending approval')).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });

  test('rezervisan termin se više ne nudi kao slobodan drugom korisniku', async ({
    page,
    loginAs,
    browser,
  }) => {
    const owner = await createActivatedUser();
    const customerA = await createActivatedUser();
    const customerB = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);

      await loginAs(customerA);
      await reserveFirstSlot(page, ctx);

      const context2 = await browser.newContext();
      try {
        const page2 = await context2.newPage();
        await loginInBrowser(page2, customerB);
        await openDayWithSlots(page2, ctx);

        const slotButton = page2.getByRole('button', { name: '08:00', exact: true });
        await expect(slotButton).toHaveAttribute('title', PENDING_TOOLTIP);
      } finally {
        await context2.close();
      }
    } finally {
      await adminApi.dispose();
    }
  });

  test('neulogovan korisnik koji pokuša rezervaciju biva poslat na login', async ({ page }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);

      await openDayWithSlots(page, ctx);
      await page.getByRole('button', { name: '08:00', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm reservation' }).click();

      // NALAZ: BusinessDetailPage.handleConfirm radi navigate('/') umesto initiateLogin()
      // za neulogovanog korisnika — ovde se očekuje login forma auth-service-a.
      await expect(page.locator('#username')).toBeVisible();
    } finally {
      await adminApi.dispose();
    }
  });
});
