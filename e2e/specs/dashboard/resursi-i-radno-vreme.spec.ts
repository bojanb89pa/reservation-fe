// E2E-013 · Resursi i radno vreme utiču na termine
//
// Vlasnik (nalog koji test sam pravi, biznis pravi admin kao u E2E-012) dodaje
// resurs i pravilo dostupnosti (radno vreme), a javni prikaz termina na
// `/businesses/:id` se menja: bez resursa i pravila nema termina, sa pravilom
// 09:00–17:00 termini postoje samo u tom opsegu, posle brisanja pravila nestaju.
//
// Resurs i pravilo se prave API pozivima vlasnika (isti endpoint-i koje zove
// dashboard); forma za pravilo nema labele na poljima (select dana, dva
// `type=time`), pa nije dostupna po ulozi i imenu bez izmene UI-ja. Proverava se
// ono što kriterijumi traže: javni prikaz termina. Usluga je fiksnih 30min, pa su
// termini nazad-u-nazad od početka pravila (09:00, 09:30 ... 16:30).

import type { APIResponse, Page } from '@playwright/test';
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

interface IdName {
  id: string;
  name: string;
}

interface SlotDto {
  startTime: string;
  status: string;
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `createActivatedUser()` ne vraća id korisnika, pa se ownerId čita preko admin pretrage naloga.
async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as { content: { id: string; email: string }[] };
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi (/auth/users/admin/accounts)`);
  }
  return match.id;
}

interface Target {
  dateStr: string;
  dayLabel: string;
  dayOfWeek: DayOfWeek;
  needsNextMonth: boolean;
  from: string;
  to: string;
}

/** Dan par dana unapred (ne "danas"), sa granicama meseca koji ga sadrži. */
function computeTarget(daysAhead: number): Target {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setDate(target.getDate() + daysAhead);
  const year = target.getFullYear();
  const month = target.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateStr: `${year}-${pad(month)}-${pad(target.getDate())}`,
    dayLabel: String(target.getDate()),
    dayOfWeek: DAYS_ORDERED[(target.getDay() + 6) % 7]!,
    needsNextMonth: target.getMonth() !== today.getMonth() || year !== today.getFullYear(),
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

interface Setup {
  ownerApi: ApiClient;
  business: IdName;
  service: IdName;
  target: Target;
}

/** Aktivan biznis sa uslugom (30min), bez resursa i pravila. Pozivalac zatvara `ownerApi`. */
async function createBusinessWithService(): Promise<Setup> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  let business: IdName;
  try {
    const ownerId = await fetchOwnerId(adminApi, owner.email);
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E Radno vreme'),
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
    await expectOk(created, 'POST /businesses/admin');
    business = (await created.json()) as IdName;
  } finally {
    await adminApi.dispose();
  }

  const ownerApi = await ApiClient.as(owner);
  const createdService = await ownerApi.post(`/businesses/${business.id}/services`, {
    data: {
      name: uniqueName('E2E Usluga'),
      minDuration: 30,
      maxDuration: 30,
      durationUnit: 'MINUTES',
      durationStep: 15,
    },
  });
  await expectOk(createdService, `POST /businesses/${business.id}/services`);
  const service = (await createdService.json()) as IdName;
  return { ownerApi, business, service, target: computeTarget(2) };
}

async function createResource(ownerApi: ApiClient, businessId: string): Promise<IdName> {
  const name = uniqueName('E2E Resurs');
  const created = await ownerApi.post(`/businesses/${businessId}/resources`, {
    data: { id: null, businessId, type: 'EMPLOYEE', name },
  });
  await expectOk(created, `POST /businesses/${businessId}/resources`);
  return (await created.json()) as IdName;
}

async function createRule(
  ownerApi: ApiClient,
  resourceId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
): Promise<string> {
  const created = await ownerApi.post(`/resources/${resourceId}/availability-rules`, {
    data: { id: null, resourceId, dayOfWeek, startTime, endTime },
  });
  await expectOk(created, `POST /resources/${resourceId}/availability-rules`);
  return ((await created.json()) as { id: string }).id;
}

async function fetchSlots(
  api: ApiClient,
  resourceId: string,
  serviceId: string,
  target: Target,
): Promise<SlotDto[]> {
  const response = await api.get(`/resources/${resourceId}/slots`, {
    params: { serviceId, from: target.from, to: target.to },
  });
  await expectOk(response, `GET /resources/${resourceId}/slots`);
  return (await response.json()) as SlotDto[];
}

/** Čeka da read model vrati (ili prestane da vraća) termine za ciljni dan. */
async function waitForTargetSlots(
  api: ApiClient,
  resourceId: string,
  serviceId: string,
  target: Target,
  expected: 'some' | 'none',
): Promise<void> {
  await expect
    .poll(
      async () => {
        const slots = await fetchSlots(api, resourceId, serviceId, target);
        return slots.some((s) => s.startTime.startsWith(target.dateStr));
      },
      { timeout: 20_000, message: `termini za ${target.dateStr} (očekivano: ${expected})` },
    )
    .toBe(expected === 'some');
}

/** Javna strana biznisa sa izabranom uslugom i (ako postoji) resursom. */
async function openPublicBusiness(
  page: Page,
  businessId: string,
  serviceName: string,
  resourceName?: string,
): Promise<void> {
  await page.goto(`/businesses/${businessId}`);
  await page.getByRole('tab', { name: new RegExp(escapeRegex(serviceName)) }).click();
  if (resourceName) {
    await page.getByRole('tab', { name: new RegExp(escapeRegex(resourceName)) }).click();
  }
}

/** Dugmad dana u kalendaru koja se mogu kliknuti. */
function enabledDays(page: Page) {
  return page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ });
}

test.describe('E2E-013 resursi i radno vreme utiču na termine', () => {
  test.describe.configure({ timeout: 120_000 });

  test('bez resursa i pravila biznis ne nudi termine', async ({ page }) => {
    const { ownerApi, business, service } = await createBusinessWithService();
    try {
      await openPublicBusiness(page, business.id, service.name);
      // Bez resursa nema izbora resursa ni kalendara termina.
      await expect(page.getByText('Resource', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Date', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '09:00', exact: true })).toHaveCount(0);
    } finally {
      await ownerApi.dispose();
    }
  });

  test('resurs bez pravila dostupnosti nema nijedan slobodan dan', async ({ page }) => {
    const { ownerApi, business, service, target } = await createBusinessWithService();
    try {
      const resource = await createResource(ownerApi, business.id);
      expect(await fetchSlots(ownerApi, resource.id, service.id, target)).toEqual([]);

      await openPublicBusiness(page, business.id, service.name, resource.name);
      await expect(page.getByText('Date', { exact: true })).toBeVisible();
      await expect(enabledDays(page)).toHaveCount(0);
    } finally {
      await ownerApi.dispose();
    }
  });

  test('pravilo 09–17 nudi termine samo u tom opsegu', async ({ page }) => {
    const { ownerApi, business, service, target } = await createBusinessWithService();
    try {
      const resource = await createResource(ownerApi, business.id);
      await createRule(ownerApi, resource.id, target.dayOfWeek, '09:00', '17:00');
      await waitForTargetSlots(ownerApi, resource.id, service.id, target, 'some');

      const slots = await fetchSlots(ownerApi, resource.id, service.id, target);
      const times = slots
        .filter((s) => s.startTime.startsWith(target.dateStr))
        .map((s) => s.startTime.slice(11, 16))
        .sort();
      expect(times[0]).toBe('09:00');
      expect(times[times.length - 1]! < '17:00').toBe(true);

      const dayButton = page.getByRole('button', { name: target.dayLabel, exact: true });
      await expect(async () => {
        await openPublicBusiness(page, business.id, service.name, resource.name);
        if (target.needsNextMonth) {
          await page.getByRole('button', { name: 'Next month' }).click();
        }
        await expect(dayButton).toBeEnabled({ timeout: 5_000 });
      }).toPass({ timeout: 60_000, intervals: [1_000] });
      await dayButton.click();

      await expect(page.getByRole('button', { name: '09:00', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '09:30', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '16:30', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '08:30', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '08:00', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '17:00', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '17:30', exact: true })).toHaveCount(0);
    } finally {
      await ownerApi.dispose();
    }
  });

  test('posle brisanja pravila termini nestaju', async ({ page }) => {
    const { ownerApi, business, service, target } = await createBusinessWithService();
    try {
      const resource = await createResource(ownerApi, business.id);
      const ruleId = await createRule(ownerApi, resource.id, target.dayOfWeek, '09:00', '17:00');
      await waitForTargetSlots(ownerApi, resource.id, service.id, target, 'some');

      const deleted = await ownerApi.delete(
        `/resources/${resource.id}/availability-rules/${ruleId}`,
      );
      await expectOk(deleted, `DELETE /resources/${resource.id}/availability-rules/${ruleId}`);
      await waitForTargetSlots(ownerApi, resource.id, service.id, target, 'none');

      await openPublicBusiness(page, business.id, service.name, resource.name);
      await expect(page.getByText('Date', { exact: true })).toBeVisible();
      await expect(enabledDays(page)).toHaveCount(0);
      if (target.needsNextMonth) {
        await page.getByRole('button', { name: 'Next month' }).click();
        await expect(enabledDays(page)).toHaveCount(0);
      }
    } finally {
      await ownerApi.dispose();
    }
  });
});
