// E2E-009 · Vlasnik vidi nove rezervacije
//
// Biznis, uslugu, resurs i pravilo dostupnosti svaki test pravi sam preko
// admin API-ja — isti obrazac kao E2E-006 (rezervacija-termina.spec.ts) i
// kontrolni tiket #30 (otkazivanje-rezervacije.spec.ts). Rezervaciju sam test
// pravi direktno pozivom na `POST /resources/:id/reservations` (isti oblik
// tela kao `ReservationApiRepository.create`), bez prolaska kroz
// BookingWidget — za ove testove je bitan samo prikaz rezervacije u
// `/dashboard/reservations`, ne tok biranja termina.
//
// `POST /businesses/admin` sa `ownerId` daje pozvaocu odmah pristup
// `/dashboard/reservations` (DashboardLayout ga ne šalje na
// /business-onboarding) — potvrđeno u prazan-naziv-lokacije.spec.ts, test
// "dashboard → novi biznis". Nije potrebno dodavati vlasnika kao EMPLOYEE
// (to je posebno pravilo samo za approve/reject, vidi napomenu na
// `addBusinessEmployee` u otkazivanje-rezervacije.spec.ts) — ovi testovi
// samo prikazuju rezervacije, ne odobravaju ih.
//
// Repeated card → `data-testid="reservation-list-item"` na
// `ReservationListItem.tsx` (dodato ovim tiketom), da asercije ostanu
// nedvosmislene i kad na deljenom CI stacku istovremeno postoje rezervacije
// iz drugih testova.

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
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
}

interface ReservationDto {
  id: string;
  status: string;
}

interface PageResponseDto<T> {
  content: T[];
}

/** `expect(res.ok())` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
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

/** Aktivan biznis (admin kreacija je odmah aktivna, vlasnik odmah vidi /dashboard/*). */
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

/** Usluga fiksnog trajanja od 30min, korak termina 15min — isto kao E2E-006. */
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

/** Par dana unapred (van "danas", da termin ne zavisi od doba dana kad CI radi). */
function computeTargetDate(daysAhead: number): { dateStr: string; dayOfWeek: DayOfWeek } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setDate(target.getDate() + daysAhead);
  const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const jsDay = target.getDay(); // 0=nedelja..6=subota
  const dayOfWeek = DAYS_ORDERED[(jsDay + 6) % 7]!;
  return { dateStr, dayOfWeek };
}

function monthRangeOf(dateStr: string): { from: string; to: string } {
  const [year, month] = dateStr.split('-').map(Number) as [number, number];
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

/**
 * Čeka da `GET /resources/:id/slots` vidi slobodan termin za ciljni dan — isti
 * razlog kao u E2E-006/kontrolnom tiketu #30: pravilo dostupnosti ume da stigne
 * do read modela sa malim zakašnjenjem.
 */
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
        return slots.some((s) => s.startTime.startsWith(dateStr) && s.status === 'AVAILABLE');
      },
      {
        timeout: 20_000,
        message: `GET /resources/${resourceId}/slots nije vratio slobodan termin za ${dateStr}`,
      },
    )
    .toBe(true);
}

interface BookableResource {
  business: BusinessDto;
  serviceId: string;
  serviceName: string;
  resourceId: string;
  startTime: string;
  endTime: string;
}

/** Biznis + usluga (30min) + resurs + pravilo dostupnosti ceo dan, spreman za rezervaciju u 08:00. */
async function createBookableResource(
  adminApi: ApiClient,
  ownerId: string,
  namePrefix: string,
): Promise<BookableResource> {
  const { dateStr, dayOfWeek } = computeTargetDate(2);
  const business = await createActiveBusiness(adminApi, ownerId, uniqueName(namePrefix));
  const service = await createFixedService(adminApi, business.id, uniqueName('E2E Usluga'));
  const resource = await createResource(adminApi, business.id, uniqueName('E2E Resurs'));
  await createAllDayAvailability(adminApi, resource.id, dayOfWeek);
  await waitForSlotAvailable(adminApi, resource.id, service.id, dateStr);
  return {
    business,
    serviceId: service.id,
    serviceName: service.name,
    resourceId: resource.id,
    startTime: `${dateStr}T08:00:00`,
    endTime: `${dateStr}T08:30:00`,
  };
}

/** Isti oblik tela kao `ReservationApiRepository.create` — rezervacija u ime pozvaoca `customerApi`. */
async function createReservation(
  customerApi: ApiClient,
  ctx: BookableResource,
): Promise<ReservationDto> {
  const created = await customerApi.post(`/resources/${ctx.resourceId}/reservations`, {
    data: {
      id: null,
      userId: null,
      resourceId: ctx.resourceId,
      serviceId: ctx.serviceId,
      startTime: ctx.startTime,
      endTime: ctx.endTime,
    },
  });
  await expectOk(created, `POST /resources/${ctx.resourceId}/reservations`);
  return (await created.json()) as ReservationDto;
}

function cancelPath(ctx: BookableResource, reservationId: string): string {
  return `/resources/${ctx.resourceId}/reservations/${reservationId}/cancel`;
}

test.describe('E2E-009 vlasnik vidi nove rezervacije', () => {
  test.describe.configure({ timeout: 90_000 });

  test('rezervacija se pojavljuje kod vlasnika sa imenom korisnika, uslugom i vremenom', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const customerMarker = uniqueName('Kupac').replace(/\s+/g, '');
    const customer = await createActivatedUser({ firstName: 'E2E', lastName: customerMarker });
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId, 'E2E Rezervacije vlasnika');
      await createReservation(customerApi, ctx);

      await loginAs(owner);
      await page.goto('/dashboard/reservations');

      const item = page.getByTestId('reservation-list-item').filter({ hasText: ctx.serviceName });
      await expect(item).toBeVisible();
      await expect(item).toContainText(`E2E ${customerMarker}`);
      await expect(item).toContainText(ctx.serviceName);
      await expect(item).toContainText(/08:00/);
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });

  test('vlasnik drugog biznisa ne vidi rezervaciju', async ({ page, loginAs }) => {
    const owner = await createActivatedUser();
    const otherOwner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId, 'E2E Rezervacije vlasnika');
      await createReservation(customerApi, ctx);

      const otherOwnerId = await fetchOwnerId(adminApi, otherOwner.email);
      await createActiveBusiness(adminApi, otherOwnerId, uniqueName('E2E Tuđi biznis'));

      await loginAs(otherOwner);
      await page.goto('/dashboard/reservations');

      // Pozitivna asercija (čeka da se upit stvarno završi i lista ostane
      // prazna) umesto `.not.toBeVisible()` odmah posle navigacije — ovo
      // drugo bi moglo lažno da prođe pre nego što se podaci uopšte učitaju.
      await expect(page.getByText('No reservations.')).toBeVisible();
      await expect(
        page.getByTestId('reservation-list-item').filter({ hasText: ctx.serviceName }),
      ).toHaveCount(0);
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });

  test('kad korisnik otkaže, vlasnik vidi promenu statusa', async ({ page, loginAs }) => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId, 'E2E Rezervacije vlasnika');
      const reservation = await createReservation(customerApi, ctx);

      await loginAs(owner);
      await page.goto('/dashboard/reservations');

      const item = page.getByTestId('reservation-list-item').filter({ hasText: ctx.serviceName });
      await expect(item).toContainText('Pending approval');

      const cancelled = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(cancelled, 'POST .../cancel');

      await page.reload();
      await expect(item).toContainText('Cancelled');
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });
});
