// Kontrolni tiket #112 (epic:112) · Biznis određuje rok za otkazivanje rezervacije pre termina
//
// Rok se postavlja sa `PUT /businesses/:id/cancellation-deadline` (`{ minNoticeMinutes }`, 1..43200),
// uklanja sa `DELETE` istog puta; `minNoticeMinutes: null` znači "bez roka" (kao do sada).
// Otkazivanje posle roka vraća 422 `error.reservation.cancellation_deadline_passed`.
// Svaki test pravi svoj biznis, uslugu, resurs, vlasnika i kupca (isti obrazac kao
// otkazivanje-rezervacije.spec.ts). Termin je uvek 08:00 za dva dana unapred, pa je
// rok od 7 dana (10080 min) sigurno prošao, a rok od 1 minuta sigurno nije.

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
  minNoticeMinutes: number | null;
}

interface ReservationDto {
  id: string;
  status: string;
}

interface ErrorDto {
  message?: string;
  code?: string;
}

interface PageResponseDto<T> {
  content: T[];
}

type Credentials = Awaited<ReturnType<typeof createActivatedUser>>;

const DEADLINE_PASSED_CODE = 'error.reservation.cancellation_deadline_passed';
const SEVEN_DAYS_MINUTES = 7 * 24 * 60;

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

async function expectStatus(response: APIResponse, status: number, label: string): Promise<void> {
  expect(response.status(), `${label}: očekivan HTTP ${status}, telo: ${await response.text()}`).toBe(
    status,
  );
}

async function fetchUserId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) throw new Error(`korisnik ${email} nije pronađen u admin pretrazi`);
  return match.id;
}

function computeTargetDate(daysAhead: number): { dateStr: string; dayOfWeek: DayOfWeek } {
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + daysAhead);
  const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  return { dateStr, dayOfWeek: DAYS_ORDERED[(target.getDay() + 6) % 7]! };
}

interface Setup {
  owner: Credentials;
  business: BusinessDto;
  serviceId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
}

/** Aktivan biznis sa vlasnikom + usluga + resurs + pravilo dostupnosti; spreman za rezervaciju u 08:00. */
async function createBookableBusiness(): Promise<Setup> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const ownerId = await fetchUserId(adminApi, owner.email);
    const { dateStr, dayOfWeek } = computeTargetDate(2);

    const createdBusiness = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E Rok'),
        ownerId,
        location: {
          name: 'E2E lokacija',
          addressLine1: 'Bulevar oslobođenja 1',
          city: 'Novi Sad',
          postalCode: '21000',
          countryCode: 'RS',
          latitude: 45.2671,
          longitude: 19.8335,
        },
      },
    });
    await expectOk(createdBusiness, 'POST /businesses/admin');
    const business = (await createdBusiness.json()) as BusinessDto;

    const createdService = await adminApi.post(`/businesses/${business.id}/services`, {
      data: {
        name: uniqueName('E2E Usluga'),
        minDuration: 30,
        maxDuration: 30,
        durationUnit: 'MINUTES',
        durationStep: 15,
      },
    });
    await expectOk(createdService, `POST /businesses/${business.id}/services`);
    const service = (await createdService.json()) as { id: string };

    const createdResource = await adminApi.post(`/businesses/${business.id}/resources`, {
      data: { id: null, businessId: business.id, type: 'EMPLOYEE', name: uniqueName('E2E Resurs') },
    });
    await expectOk(createdResource, `POST /businesses/${business.id}/resources`);
    const resource = (await createdResource.json()) as { id: string };

    const rule = await adminApi.post(`/resources/${resource.id}/availability-rules`, {
      data: { id: null, resourceId: resource.id, dayOfWeek, startTime: '08:00', endTime: '20:00' },
    });
    await expectOk(rule, `POST /resources/${resource.id}/availability-rules`);

    const [year, month] = dateStr.split('-').map(Number) as [number, number];
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    await expect
      .poll(
        async () => {
          const response = await adminApi.get(`/resources/${resource.id}/slots`, {
            params: { serviceId: service.id, from, to },
          });
          if (!response.ok()) return false;
          const slots = (await response.json()) as { startTime: string; status: string }[];
          return slots.some((s) => s.startTime.startsWith(dateStr) && s.status === 'AVAILABLE');
        },
        { timeout: 20_000, message: `nema slobodnog termina za ${dateStr}` },
      )
      .toBe(true);

    return {
      owner,
      business,
      serviceId: service.id,
      resourceId: resource.id,
      startTime: `${dateStr}T08:00:00`,
      endTime: `${dateStr}T08:30:00`,
    };
  } finally {
    await adminApi.dispose();
  }
}

async function createReservation(customerApi: ApiClient, ctx: Setup): Promise<ReservationDto> {
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

function cancelPath(ctx: Setup, reservationId: string): string {
  return `/resources/${ctx.resourceId}/reservations/${reservationId}/cancel`;
}

function deadlinePath(businessId: string): string {
  return `/businesses/${businessId}/cancellation-deadline`;
}

async function getBusiness(api: ApiClient, businessId: string): Promise<BusinessDto> {
  const response = await api.get(`/businesses/${businessId}`);
  await expectOk(response, `GET /businesses/${businessId}`);
  return (await response.json()) as BusinessDto;
}

test.describe('E2E-462 rok za otkazivanje rezervacije', () => {
  test.describe.configure({ timeout: 120_000 });

  test('vlasnik postavlja i uklanja rok; biznis bez roka ima minNoticeMinutes null', async () => {
    const { owner, business } = await createBookableBusiness();
    const ownerApi = await ApiClient.as(owner);
    try {
      expect((await getBusiness(ownerApi, business.id)).minNoticeMinutes).toBeNull();

      const set = await ownerApi.put(deadlinePath(business.id), { data: { minNoticeMinutes: 1440 } });
      await expectOk(set, 'PUT cancellation-deadline');
      expect(((await set.json()) as BusinessDto).minNoticeMinutes).toBe(1440);
      expect((await getBusiness(ownerApi, business.id)).minNoticeMinutes).toBe(1440);

      const removed = await ownerApi.delete(deadlinePath(business.id));
      await expectOk(removed, 'DELETE cancellation-deadline');
      expect(((await removed.json()) as BusinessDto).minNoticeMinutes).toBeNull();
      expect((await getBusiness(ownerApi, business.id)).minNoticeMinutes).toBeNull();
    } finally {
      await ownerApi.dispose();
    }
  });

  test('tuđi biznis ne može da postavi ni ukloni rok (403), rok ostaje nepromenjen', async () => {
    const { owner, business } = await createBookableBusiness();
    const stranger = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    const strangerApi = await ApiClient.as(stranger);
    try {
      await expectOk(
        await ownerApi.put(deadlinePath(business.id), { data: { minNoticeMinutes: 60 } }),
        'PUT (vlasnik)',
      );

      const setAttempt = await strangerApi.put(deadlinePath(business.id), {
        data: { minNoticeMinutes: 120 },
      });
      await expectStatus(setAttempt, 403, 'PUT cancellation-deadline (tuđi biznis)');
      expect(((await setAttempt.json()) as ErrorDto).code).toBe('error.business.owner_required');

      const removeAttempt = await strangerApi.delete(deadlinePath(business.id));
      await expectStatus(removeAttempt, 403, 'DELETE cancellation-deadline (tuđi biznis)');

      expect((await getBusiness(ownerApi, business.id)).minNoticeMinutes).toBe(60);
    } finally {
      await ownerApi.dispose();
      await strangerApi.dispose();
    }
  });

  test('rok van opsega 1..43200 se odbija i ne menja postojeći rok', async () => {
    const { owner, business } = await createBookableBusiness();
    const ownerApi = await ApiClient.as(owner);
    try {
      for (const value of [0, -5, 43201]) {
        const response = await ownerApi.put(deadlinePath(business.id), {
          data: { minNoticeMinutes: value },
        });
        expect(
          [400, 422],
          `PUT minNoticeMinutes=${value}: HTTP ${response.status()} ${await response.text()}`,
        ).toContain(response.status());
      }
      expect((await getBusiness(ownerApi, business.id)).minNoticeMinutes).toBeNull();

      // Granične vrednosti su dozvoljene.
      await expectOk(
        await ownerApi.put(deadlinePath(business.id), { data: { minNoticeMinutes: 1 } }),
        'PUT minNoticeMinutes=1',
      );
      await expectOk(
        await ownerApi.put(deadlinePath(business.id), { data: { minNoticeMinutes: 43200 } }),
        'PUT minNoticeMinutes=43200',
      );
    } finally {
      await ownerApi.dispose();
    }
  });

  test('otkazivanje posle roka vraća 422 sa kodom isteklog roka', async () => {
    const ctx = await createBookableBusiness();
    const customer = await createActivatedUser();
    const ownerApi = await ApiClient.as(ctx.owner);
    const customerApi = await ApiClient.as(customer);
    try {
      const reservation = await createReservation(customerApi, ctx);
      await expectOk(
        await ownerApi.put(deadlinePath(ctx.business.id), {
          data: { minNoticeMinutes: SEVEN_DAYS_MINUTES },
        }),
        'PUT cancellation-deadline',
      );

      const cancel = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectStatus(cancel, 422, 'POST .../cancel (posle roka)');
      expect(((await cancel.json()) as ErrorDto).code).toBe(DEADLINE_PASSED_CODE);
    } finally {
      await ownerApi.dispose();
      await customerApi.dispose();
    }
  });

  test('otkazivanje pre isteka roka radi kao do sada', async () => {
    const ctx = await createBookableBusiness();
    const customer = await createActivatedUser();
    const ownerApi = await ApiClient.as(ctx.owner);
    const customerApi = await ApiClient.as(customer);
    try {
      const reservation = await createReservation(customerApi, ctx);
      await expectOk(
        await ownerApi.put(deadlinePath(ctx.business.id), { data: { minNoticeMinutes: 1 } }),
        'PUT cancellation-deadline (1 min)',
      );

      const cancel = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(cancel, 'POST .../cancel (pre roka)');
      expect(((await cancel.json()) as ReservationDto).status).toBe('CANCELLED');
    } finally {
      await ownerApi.dispose();
      await customerApi.dispose();
    }
  });

  test('posle uklanjanja roka otkazivanje je ponovo dozvoljeno do početka termina', async () => {
    const ctx = await createBookableBusiness();
    const customer = await createActivatedUser();
    const ownerApi = await ApiClient.as(ctx.owner);
    const customerApi = await ApiClient.as(customer);
    try {
      const reservation = await createReservation(customerApi, ctx);
      await expectOk(
        await ownerApi.put(deadlinePath(ctx.business.id), {
          data: { minNoticeMinutes: SEVEN_DAYS_MINUTES },
        }),
        'PUT cancellation-deadline',
      );
      await expectStatus(
        await customerApi.post(cancelPath(ctx, reservation.id)),
        422,
        'POST .../cancel (rok prošao)',
      );

      await expectOk(await ownerApi.delete(deadlinePath(ctx.business.id)), 'DELETE cancellation-deadline');

      const cancel = await customerApi.post(cancelPath(ctx, reservation.id));
      await expectOk(cancel, 'POST .../cancel (rok uklonjen)');
      expect(((await cancel.json()) as ReservationDto).status).toBe('CANCELLED');
    } finally {
      await ownerApi.dispose();
      await customerApi.dispose();
    }
  });

  test('vlasnik u dashboard-u postavlja i uklanja rok otkazivanja', async ({ page, loginAs }) => {
    const { owner, business } = await createBookableBusiness();

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    await expect(page.getByRole('heading', { name: 'Cancellation deadline' })).toBeVisible();
    await expect(page.getByText('No deadline: reservations can be cancelled')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove deadline' })).toHaveCount(0);

    await page.getByLabel('Cancel at the latest').fill('2');
    await page.getByLabel('Unit').selectOption('days');
    await page.getByRole('button', { name: 'Save deadline' }).click();
    await expect(
      page.getByText('Cancellation allowed up to 2 days before the appointment.'),
    ).toBeVisible();

    const ownerApi = await ApiClient.as(owner);
    try {
      expect((await getBusiness(ownerApi, business.id)).minNoticeMinutes).toBe(2880);
    } finally {
      await ownerApi.dispose();
    }

    await page.getByRole('button', { name: 'Remove deadline' }).click();
    await expect(page.getByText('No deadline: reservations can be cancelled')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove deadline' })).toHaveCount(0);
  });

  test('dashboard odbija rok van opsega', async ({ page, loginAs }) => {
    const { owner, business } = await createBookableBusiness();

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    await expect(page.getByRole('heading', { name: 'Cancellation deadline' })).toBeVisible();

    await page.getByLabel('Cancel at the latest').fill('31');
    await page.getByLabel('Unit').selectOption('days');
    await page.getByRole('button', { name: 'Save deadline' }).click();

    await expect(
      page.getByText('Enter a whole number of minutes between 1 minute and 30 days.'),
    ).toBeVisible();
    await expect(page.getByText('No deadline: reservations can be cancelled')).toBeVisible();
  });

  test('na „Moje rezervacije” posle roka korisnik vidi poruku da je rok za otkazivanje prošao', async ({
    page,
    loginAs,
  }) => {
    const ctx = await createBookableBusiness();
    const customer = await createActivatedUser();
    const ownerApi = await ApiClient.as(ctx.owner);
    const customerApi = await ApiClient.as(customer);
    try {
      await createReservation(customerApi, ctx);
      await expectOk(
        await ownerApi.put(deadlinePath(ctx.business.id), {
          data: { minNoticeMinutes: SEVEN_DAYS_MINUTES },
        }),
        'PUT cancellation-deadline',
      );

      await loginAs(customer);
      await page.goto('/my-reservations');
      const cancelButton = page.getByRole('button', { name: 'Cancel reservation' });
      await expect(cancelButton).toBeVisible();

      page.once('dialog', (dialog) => dialog.accept());
      await cancelButton.click();

      await expect(page.getByRole('alert')).toContainText(
        'This reservation can no longer be cancelled: the cancellation deadline has passed.',
      );
      await expect(page.getByText('Pending approval')).toBeVisible();
    } finally {
      await ownerApi.dispose();
      await customerApi.dispose();
    }
  });
});
