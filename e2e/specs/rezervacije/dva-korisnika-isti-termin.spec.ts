// E2E-021 · Dva korisnika, isti termin
//
// Dva browser konteksta biraju isti slobodan termin (08:00) pre nego što bilo ko
// potvrdi; zatim oba potvrđuju. Priprema podataka (biznis, usluga 30min, resurs,
// pravilo dostupnosti) je ista kao u E2E-006 (rezervacija-termina.spec.ts).

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

test.describe('E2E-021 dva korisnika, isti termin', () => {
  test.describe.configure({ timeout: 180_000 });

  test('samo jedan korisnik dobija termin, drugi dobija poruku i može da izabere drugi', async ({
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

        // Drugi ne sme da završi na hold strani, već dobija razumljivu poruku...
        await expect(page2.getByRole('alert')).toBeVisible();
        await expect(page2).not.toHaveURL(/\/reservation\//);
        // ...i ostaje na izboru termina, gde može da izabere drugi (08:30).
        const otherSlot = page2.getByRole('button', { name: '08:30', exact: true });
        await expect(otherSlot).toBeEnabled();
        await otherSlot.click();
        await expect(otherSlot).toHaveAttribute('aria-pressed', 'true');
      } finally {
        await context2.close();
      }

      // Samo jedna rezervacija za taj resurs, i to od prvog korisnika.
      const apiA = await ApiClient.as(customerA);
      const apiB = await ApiClient.as(customerB);
      try {
        const resA = await apiA.get('/reservations');
        await expectOk(resA, 'GET /reservations (A)');
        const resB = await apiB.get('/reservations');
        await expectOk(resB, 'GET /reservations (B)');
        const forResource = (list: { resourceId: string }[]) =>
          list.filter((r) => r.resourceId === ctx.resource.id);
        expect(forResource((await resA.json()) as { resourceId: string }[])).toHaveLength(1);
        expect(forResource((await resB.json()) as { resourceId: string }[])).toHaveLength(0);
      } finally {
        await apiA.dispose();
        await apiB.dispose();
      }
    } finally {
      await adminApi.dispose();
    }
  });
});
