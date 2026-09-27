// Kontrolni tiket #30 (epic:30) · Otkazivanje rezervacije od strane korisnika
//
// Biznis, uslugu, resurs i pravilo dostupnosti svaki test pravi sam preko
// admin API-ja — isti obrazac kao E2E-006 (rezervacija-termina.spec.ts).
// Rezervaciju sam test pravi direktno pozivom na
// `POST /resources/:id/reservations` sa nalogom kupca (isti oblik tela kao
// `ReservationApiRepository.create`), bez prolaska kroz BookingWidget — za
// ove testove je bitan samo status rezervacije, ne tok biranja termina.
//
// Podrazumevana politika otkazivanja (dokumentovana u kontrolnom tiketu, ista
// za sve biznise za sada): dozvoljeno za PENDING_APPROVAL i CONFIRMED, sve
// ostalo (REJECTED, CANCELLED) vraća 422.

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

type ReservationStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

interface BusinessDto {
  id: string;
  name: string;
}

interface BusinessServiceDto {
  id: string;
}

interface ResourceDto {
  id: string;
}

interface ReservationDto {
  id: string;
  userId: string | null;
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

interface PageResponseDto<T> {
  content: T[];
}

/** `expect(res.ok())` sa statusom i telom u poruci — bez ovoga CI log ne kaže zašto poziv nije uspeo. */
async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/** Isto kao `expectOk`, ali za očekivanu grešku (409/422/...) — proverava tačan status. */
async function expectStatus(
  response: APIResponse,
  status: number,
  label: string,
): Promise<void> {
  expect(response.status(), `${label}: očekivan HTTP ${status}, telo: ${await response.text()}`).toBe(
    status,
  );
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
 * Čeka da `GET /resources/:id/slots` vidi slobodan termin za ciljni dan — isto
 * razlog kao u E2E-006: pravilo dostupnosti ume da stigne do read modela sa
 * malim zakašnjenjem.
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

/** Status termina 08:00 istog dana u `GET /resources/:id/slots` — `undefined` ako termin nije u opsegu. */
async function slotStatusAt(
  adminApi: ApiClient,
  resourceId: string,
  serviceId: string,
  startTimeIso: string,
): Promise<string | undefined> {
  const dateStr = startTimeIso.slice(0, 10);
  const { from, to } = monthRangeOf(dateStr);
  const response = await adminApi.get(`/resources/${resourceId}/slots`, {
    params: { serviceId, from, to },
  });
  await expectOk(response, `GET /resources/${resourceId}/slots`);
  const slots = (await response.json()) as { startTime: string; status: string }[];
  return slots.find((s) => s.startTime === startTimeIso)?.status;
}

interface BookableResource {
  business: BusinessDto;
  serviceId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
}

/** Biznis + usluga (30min) + resurs + pravilo dostupnosti ceo dan, spreman za rezervaciju u 08:00. */
async function createBookableResource(adminApi: ApiClient, ownerId: string): Promise<BookableResource> {
  const { dateStr, dayOfWeek } = computeTargetDate(2);
  const business = await createActiveBusiness(adminApi, ownerId, uniqueName('E2E Otkazivanje'));
  const service = await createFixedService(adminApi, business.id, uniqueName('E2E Usluga'));
  const resource = await createResource(adminApi, business.id, uniqueName('E2E Resurs'));
  await createAllDayAvailability(adminApi, resource.id, dayOfWeek);
  await waitForSlotAvailable(adminApi, resource.id, service.id, dateStr);
  return {
    business,
    serviceId: service.id,
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

/**
 * `ownerId` na `POST /businesses/admin` samo popunjava informativno polje na `Business` — NE
 * pravi `BusinessMembership` red. `ApproveReservationUseCaseImpl`/`RejectReservationUseCaseImpl`
 * (resource-service) proveravaju isključivo `existsMembership(businessId, userId,
 * BusinessMemberRole.EMPLOYEE)` — striktan match po roli, bez hijerarhije OWNER⊇EMPLOYEE
 * (potvrđeno i u `ApproveReservationUseCaseTest`). `POST /businesses/{id}/owners` upisuje
 * isključivo rolu `OWNER` (`AddBusinessOwnerUseCaseImpl`), pa vlasnik-bez-employee-članstva
 * dobija 409 `employee_not_authorized` na approve/reject bez obzira koliko se čeka — to nije
 * read-model kašnjenje, nego pogrešna rola. Zato se ovde koristi `POST /businesses/{id}/employees`.
 *
 * `AddBusinessEmployeeUseCaseImpl` upisuje red preko `addPendingMembership` — `userId = null`,
 * uparen samo preko `email`. `existsMembership` u approve/reject filtrira po pravom `userId`, pa
 * taj red ne važi dok se ne "razreši". Razrešavanje (`resolvePendingMemberships`, upiše pravi
 * `userId` preko email match-a) je sinhrono i dešava se samo unutar `GET /businesses/me`
 * (`BusinessController.getMyBusinesses`, vidi WARNING komentar tamo — namerno "lenjo" rešenje iz
 * tiketa #63). Zato zaposleni MORA sam pozvati `GET /businesses/me` pre approve/reject —
 * `waitForBusinessEmployee` ispod samo potvrđuje da je `adminApi` upis (pending, po email-u)
 * uopšte stigao pre toga.
 */
async function addBusinessEmployee(adminApi: ApiClient, businessId: string, email: string): Promise<void> {
  const added = await adminApi.post(`/businesses/${businessId}/employees`, { data: { email } });
  await expectOk(added, `POST /businesses/${businessId}/employees`);
}

interface BusinessMembershipDto {
  id: string;
  businessId: string;
  userId: string | null;
  email: string | null;
  role: 'OWNER' | 'EMPLOYEE';
}

async function waitForBusinessEmployee(
  adminApi: ApiClient,
  businessId: string,
  email: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await adminApi.get(`/businesses/${businessId}/employees`);
        if (!response.ok()) return false;
        const employees = (await response.json()) as BusinessMembershipDto[];
        return employees.some((e) => e.email === email);
      },
      {
        timeout: 20_000,
        message: `GET /businesses/${businessId}/employees nije video ${email} kao zaposlenog na vreme`,
      },
    )
    .toBe(true);
}

/** Razrešava pending `BusinessMembership` (po email-u) u pravi `userId` za pozvaoca — vidi napomenu na `addBusinessEmployee`. */
async function resolveOwnPendingMemberships(employeeApi: ApiClient): Promise<void> {
  const response = await employeeApi.get('/businesses/me');
  await expectOk(response, 'GET /businesses/me (razrešavanje pending članstva)');
}

test.describe('E2E-146 otkazivanje rezervacije od strane korisnika', () => {
  test.describe.configure({ timeout: 90_000 });

  test('korisnik otkazuje sopstvenu rezervaciju na čekanju (PENDING_APPROVAL) — status postaje CANCELLED, termin se oslobađa', async () => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      const reservation = await createReservation(customerApi, ctx);
      expect(reservation.status).toBe('PENDING_APPROVAL');

      const cancelled = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(cancelled, 'POST .../cancel');
      const body = (await cancelled.json()) as ReservationDto;
      expect(body.status).toBe('CANCELLED');

      await expect
        .poll(() => slotStatusAt(adminApi, ctx.resourceId, ctx.serviceId, ctx.startTime), {
          message: `termin ${ctx.startTime} nije ponovo slobodan (AVAILABLE) posle otkazivanja`,
        })
        .toBe('AVAILABLE');
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });

  test('korisnik otkazuje sopstvenu potvrđenu (CONFIRMED) rezervaciju', async () => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      await addBusinessEmployee(adminApi, ctx.business.id, owner.email);
      await waitForBusinessEmployee(adminApi, ctx.business.id, owner.email);
      await resolveOwnPendingMemberships(ownerApi);
      const reservation = await createReservation(customerApi, ctx);

      const approved = await ownerApi.post(
        `/resources/${ctx.resourceId}/reservations/${reservation.id}/approve`,
      );
      await expectOk(approved, 'POST .../approve');
      expect(((await approved.json()) as ReservationDto).status).toBe('CONFIRMED');

      const cancelled = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(cancelled, 'POST .../cancel');
      expect(((await cancelled.json()) as ReservationDto).status).toBe('CANCELLED');
    } finally {
      await adminApi.dispose();
      await ownerApi.dispose();
      await customerApi.dispose();
    }
  });

  test('otkazivanje tuđe rezervacije vraća 409', async () => {
    const owner = await createActivatedUser();
    const customerA = await createActivatedUser();
    const customerB = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerAApi = await ApiClient.as(customerA);
    const customerBApi = await ApiClient.as(customerB);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      const reservation = await createReservation(customerAApi, ctx);

      const response = await customerBApi.post(cancelPath(ctx, reservation.id));
      await expectStatus(response, 409, 'POST .../cancel (tuđa rezervacija)');
    } finally {
      await adminApi.dispose();
      await customerAApi.dispose();
      await customerBApi.dispose();
    }
  });

  test('otkazivanje već otkazane (CANCELLED) rezervacije vraća 422', async () => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      const reservation = await createReservation(customerApi, ctx);

      const firstCancel = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(firstCancel, 'POST .../cancel (prvi put)');

      const secondCancel = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectStatus(secondCancel, 422, 'POST .../cancel (drugi put, već CANCELLED)');
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });

  test('otkazivanje odbijene (REJECTED) rezervacije vraća 422', async () => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      await addBusinessEmployee(adminApi, ctx.business.id, owner.email);
      await waitForBusinessEmployee(adminApi, ctx.business.id, owner.email);
      await resolveOwnPendingMemberships(ownerApi);
      const reservation = await createReservation(customerApi, ctx);

      const rejected = await ownerApi.post(
        `/resources/${ctx.resourceId}/reservations/${reservation.id}/reject`,
      );
      await expectOk(rejected, 'POST .../reject');
      expect(((await rejected.json()) as ReservationDto).status).toBe('REJECTED');

      const cancelResponse = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectStatus(cancelResponse, 422, 'POST .../cancel (rezervacija je REJECTED)');
    } finally {
      await adminApi.dispose();
      await ownerApi.dispose();
      await customerApi.dispose();
    }
  });

  test('na „Moje rezervacije” korisnik otkazuje rezervaciju preko dugmeta uz potvrdu', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      await createReservation(customerApi, ctx);

      await loginAs(customer);
      await page.goto('/my-reservations');

      await expect(page.getByText('Pending approval')).toBeVisible();
      const cancelButton = page.getByRole('button', { name: 'Cancel reservation' });
      await expect(cancelButton).toBeVisible();

      page.once('dialog', (dialog) => dialog.accept());
      await cancelButton.click();

      await expect(page.getByText('Cancelled')).toBeVisible();
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });

  // Kontrolni tiket #30 traži da dugme bude vidljivo SAMO kad je status rezervacije
  // dozvoljen za otkazivanje — podrazumevana politika dozvoljava samo PENDING_APPROVAL i
  // CONFIRMED, pa za CANCELLED (i REJECTED) dugme ne bi trebalo da postoji
  // (`ReservationListItem.tsx` proverava `CANCELLABLE_STATUSES` pored `isOwnReservation`).
  test('dugme za otkazivanje se ne prikazuje za rezervaciju koja više nije u statusu koji politika dozvoljava', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const customerApi = await ApiClient.as(customer);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookableResource(adminApi, ownerId);
      const reservation = await createReservation(customerApi, ctx);

      const cancelled = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(cancelled, 'POST .../cancel (priprema: rezervacija već otkazana)');

      await loginAs(customer);
      await page.goto('/my-reservations');

      await expect(page.getByText('Cancelled')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel reservation' })).not.toBeVisible();
    } finally {
      await adminApi.dispose();
      await customerApi.dispose();
    }
  });
});
