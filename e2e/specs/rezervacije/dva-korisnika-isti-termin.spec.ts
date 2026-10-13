// E2E-021 · Dva korisnika, isti termin (epic: podešavanje preklapanja PENDING rezervacija)
//
// Biznis, uslugu, resurs i pravilo dostupnosti svaki test pravi sam (isti obrazac kao u
// E2E-006, rezervacija-termina.spec.ts). Vlasnik biznisa je dodat i kao OWNER i kao EMPLOYEE:
// podešavanje menja samo vlasnik, a approve/reject traži EMPLOYEE rolu (vidi napomenu na
// `addBusinessEmployee` u otkazivanje-rezervacije.spec.ts). Pending članstva se razrešavaju
// pozivom `GET /businesses/me` kao taj korisnik.

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

interface ReservationDto {
  id: string;
  resourceId: string;
  status: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
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
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

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

function monthRangeOf(dateStr: string): { from: string; to: string } {
  const [year, month] = dateStr.split('-').map(Number) as [number, number];
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

async function waitForSlotAvailable(
  adminApi: ApiClient,
  resourceId: string,
  serviceId: string,
  dateStr: string,
): Promise<void> {
  const { from, to } = monthRangeOf(dateStr);
  await expect
    .poll(
      async () => {
        const response = await adminApi.get(`/resources/${resourceId}/slots`, {
          params: { serviceId, from, to },
        });
        if (!response.ok()) return false;
        const slots = (await response.json()) as { startTime: string; status: string }[];
        return slots.some((s) => s.startTime.startsWith(dateStr) && s.status !== 'CONFIRMED');
      },
      {
        timeout: 20_000,
        message: `GET /resources/${resourceId}/slots nije vratio slobodan termin za ${dateStr}`,
      },
    )
    .toBe(true);
}

interface TargetDate {
  dateStr: string;
  dayLabel: string;
  dayOfWeek: DayOfWeek;
  needsNextMonth: boolean;
}

function computeTargetDate(daysAhead: number): TargetDate {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setDate(target.getDate() + daysAhead);
  const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const jsDay = target.getDay();
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
  await waitForSlotAvailable(adminApi, resource.id, service.id, target.dateStr);
  return { business, service, resource, target };
}

/** Izbor usluge, resursa i ciljnog dana; ponavlja učitavanje dok dugme dana ne postane klikabilno. */
async function openDayWithSlots(page: Page, ctx: BookableBusiness): Promise<void> {
  const dayButton = page.getByRole('button', { name: ctx.target.dayLabel, exact: true });
  await expect(async () => {
    await page.goto(`/businesses/${ctx.business.id}`);
    await page.getByRole('tab', { name: new RegExp(escapeRegex(ctx.service.name)) }).click();
    await page.getByRole('tab', { name: new RegExp(escapeRegex(ctx.resource.name)) }).click();
    if (ctx.target.needsNextMonth) {
      await page.getByRole('button', { name: 'Next month' }).click();
    }
    await expect(dayButton).toBeEnabled({ timeout: 5_000 });
  }).toPass({ timeout: 60_000, intervals: [1_000] });
  await dayButton.click();
}

/** Bira termin 08:00 i čeka da bude izabran — bez potvrde. */
async function pickFirstSlot(page: Page, ctx: BookableBusiness): Promise<void> {
  await openDayWithSlots(page, ctx);
  const slot = page.getByRole('button', { name: '08:00', exact: true });
  await slot.click();
  await expect(slot).toHaveAttribute('aria-pressed', 'true');
}

async function addMemberships(
  adminApi: ApiClient,
  businessId: string,
  email: string,
): Promise<void> {
  const owner = await adminApi.post(`/businesses/${businessId}/owners`, { data: { email } });
  await expectOk(owner, `POST /businesses/${businessId}/owners`);
  const employee = await adminApi.post(`/businesses/${businessId}/employees`, { data: { email } });
  await expectOk(employee, `POST /businesses/${businessId}/employees`);
  await expect
    .poll(
      async () => {
        const response = await adminApi.get(`/businesses/${businessId}/employees`);
        if (!response.ok()) return false;
        const list = (await response.json()) as { email: string | null }[];
        return list.some((m) => m.email === email);
      },
      { timeout: 20_000, message: `${email} nije vidljiv kao zaposleni na vreme` },
    )
    .toBe(true);
}

async function reservationsForResource(
  api: ApiClient,
  resourceId: string,
): Promise<ReservationDto[]> {
  const response = await api.get('/reservations');
  await expectOk(response, 'GET /reservations');
  return ((await response.json()) as ReservationDto[]).filter((r) => r.resourceId === resourceId);
}

test.describe('E2E-021 dva korisnika, isti termin', () => {
  test.describe.configure({ timeout: 180_000 });

  test('preklapanje zabranjeno: drugi dobija poruku, ostaje na izboru termina i rezerviše drugi termin', async ({
    page,
    loginAs,
    browser,
  }) => {
    const owner = await createActivatedUser();
    const customerA = await createActivatedUser();
    const customerB = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);
      await addMemberships(adminApi, ctx.business.id, owner.email);
      await expectOk(await ownerApi.get('/businesses/me'), 'GET /businesses/me');

      const patched = await ownerApi.patch(
        `/businesses/${ctx.business.id}/overlapping-pending-reservations`,
        { data: { allowOverlappingPendingReservations: false } },
      );
      await expectOk(patched, 'PATCH .../overlapping-pending-reservations');
      expect(
        ((await patched.json()) as { allowOverlappingPendingReservations: boolean })
          .allowOverlappingPendingReservations,
      ).toBe(false);

      await loginAs(customerA);
      const context2 = await browser.newContext();
      try {
        const page2 = await context2.newPage();
        await loginInBrowser(page2, customerB);

        // Oba korisnika vide isti termin kao slobodan i biraju ga pre nego što bilo ko potvrdi.
        await pickFirstSlot(page, ctx);
        await pickFirstSlot(page2, ctx);

        await page.getByRole('button', { name: 'Confirm reservation' }).click();
        await page.waitForURL(/\/reservation\/[^/]+\/held$/);

        await page2.getByRole('button', { name: 'Confirm reservation' }).click();

        await expect(page2.getByRole('alert')).toBeVisible();
        await expect(page2).not.toHaveURL(/\/reservation\//);

        // Ostaje na izboru termina i može odmah da izabere drugi (08:30) i potvrdi ga.
        const otherSlot = page2.getByRole('button', { name: '08:30', exact: true });
        await expect(otherSlot).toBeEnabled();
        await otherSlot.click();
        await expect(otherSlot).toHaveAttribute('aria-pressed', 'true');
        await page2.getByRole('button', { name: 'Confirm reservation' }).click();
        await page2.waitForURL(/\/reservation\/[^/]+\/held$/);
      } finally {
        await context2.close();
      }

      // Za termin 08:00 postoji tačno jedna rezervacija (prvog korisnika); drugi ima onu u 08:30.
      const apiA = await ApiClient.as(customerA);
      const apiB = await ApiClient.as(customerB);
      try {
        const forA = await reservationsForResource(apiA, ctx.resource.id);
        const forB = await reservationsForResource(apiB, ctx.resource.id);
        expect(forA).toHaveLength(1);
        expect(forB).toHaveLength(1);
        expect(forA[0]!.id).not.toBe(forB[0]!.id);
      } finally {
        await apiA.dispose();
        await apiB.dispose();
      }
    } finally {
      await ownerApi.dispose();
      await adminApi.dispose();
    }
  });

  test('preklapanje dozvoljeno (podrazumevano): oba dobijaju PENDING, odobravanje drugog vraća 409', async ({
    page,
    loginAs,
    browser,
  }) => {
    const owner = await createActivatedUser();
    const customerA = await createActivatedUser();
    const customerB = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableBusiness(adminApi, ownerId);
      await addMemberships(adminApi, ctx.business.id, owner.email);
      await expectOk(await ownerApi.get('/businesses/me'), 'GET /businesses/me');

      await loginAs(customerA);
      const context2 = await browser.newContext();
      try {
        const page2 = await context2.newPage();
        await loginInBrowser(page2, customerB);

        await pickFirstSlot(page, ctx);
        await pickFirstSlot(page2, ctx);

        await page.getByRole('button', { name: 'Confirm reservation' }).click();
        await page.waitForURL(/\/reservation\/[^/]+\/held$/);
        await page2.getByRole('button', { name: 'Confirm reservation' }).click();
        await page2.waitForURL(/\/reservation\/[^/]+\/held$/);
      } finally {
        await context2.close();
      }

      const apiA = await ApiClient.as(customerA);
      const apiB = await ApiClient.as(customerB);
      try {
        const [resA] = await reservationsForResource(apiA, ctx.resource.id);
        const [resB] = await reservationsForResource(apiB, ctx.resource.id);
        expect(resA?.status).toBe('PENDING_APPROVAL');
        expect(resB?.status).toBe('PENDING_APPROVAL');

        const approveA = await ownerApi.post(
          `/resources/${ctx.resource.id}/reservations/${resA!.id}/approve`,
        );
        await expectOk(approveA, 'POST .../approve (prva)');

        const approveB = await ownerApi.post(
          `/resources/${ctx.resource.id}/reservations/${resB!.id}/approve`,
        );
        expect(approveB.status(), await approveB.text()).toBe(409);
        expect(((await approveB.json()) as { code?: string }).code).toBe('RESERVATION_SLOT_TAKEN');

        const all = [
          ...(await reservationsForResource(apiA, ctx.resource.id)),
          ...(await reservationsForResource(apiB, ctx.resource.id)),
        ];
        expect(all.filter((r) => r.status === 'CONFIRMED')).toHaveLength(1);
      } finally {
        await apiA.dispose();
        await apiB.dispose();
      }
    } finally {
      await ownerApi.dispose();
      await adminApi.dispose();
    }
  });
});
