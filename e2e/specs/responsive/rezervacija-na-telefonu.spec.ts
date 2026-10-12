// E2E-020 · Rezervacija na telefonu
//
// Ceo tok iz E2E-006 (rezervacija-termina.spec.ts) u viewport-u 390×844 (Playwright
// projekat `mobile`, vidi playwright.config.ts): izbor usluge i resursa, dana i termina,
// potvrda, hold strana i „Moje rezervacije". Na svakom koraku proverava da strana nema
// horizontalni skrol i da je dugme koje se klikće u viewport-u.

import type { APIResponse, Locator, Page } from '@playwright/test';
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

/** Strana ne sme biti šira od viewport-a (nema horizontalnog skrola). */
async function expectNoHorizontalScroll(page: Page, step: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${step}: strana je šira od viewport-a za ${overflow}px`).toBeLessThanOrEqual(0);
}

/** Dugme je vidljivo, omogućeno i cela njegova kutija je unutar širine viewport-a. */
async function expectTappable(page: Page, button: Locator, step: string): Promise<void> {
  await button.scrollIntoViewIfNeeded();
  await expect(button, step).toBeVisible();
  await expect(button, step).toBeEnabled();
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${step}: nema bounding box`).not.toBeNull();
  expect(box!.x, `${step}: dugme van levog ivice`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${step}: dugme van desne ivice`).toBeLessThanOrEqual(
    viewport!.width,
  );
}

async function fetchOwnerId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, 'GET /auth/users/admin/accounts');
  const result = (await response.json()) as { content: { id: string; email: string }[] };
  const match = result.content.find((u) => u.email === email);
  if (!match) throw new Error(`korisnik ${email} nije pronađen u admin pretrazi`);
  return match.id;
}

interface Bookable {
  business: IdName;
  service: IdName;
  resource: IdName;
  dayLabel: string;
  dateStr: string;
  needsNextMonth: boolean;
}

/** Biznis + usluga (30min) + resurs + pravilo dostupnosti 08:00–20:00 za dan za 2 dana. */
async function createBookable(adminApi: ApiClient, ownerId: string): Promise<Bookable> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setDate(target.getDate() + 2);
  const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const dayOfWeek = DAYS_ORDERED[(target.getDay() + 6) % 7]!;
  const needsNextMonth =
    target.getMonth() !== today.getMonth() || target.getFullYear() !== today.getFullYear();

  const businessRes = await adminApi.post('/businesses/admin', {
    data: {
      name: uniqueName('E2E Telefon'),
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
  await expectOk(businessRes, 'POST /businesses/admin');
  const business = (await businessRes.json()) as IdName;

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
  const service = (await serviceRes.json()) as IdName;

  const resourceRes = await adminApi.post(`/businesses/${business.id}/resources`, {
    data: { id: null, businessId: business.id, type: 'EMPLOYEE', name: uniqueName('E2E Resurs') },
  });
  await expectOk(resourceRes, 'POST resources');
  const resource = (await resourceRes.json()) as IdName;

  const ruleRes = await adminApi.post(`/resources/${resource.id}/availability-rules`, {
    data: {
      id: null,
      resourceId: resource.id,
      dayOfWeek,
      startTime: '08:00',
      endTime: '20:00',
    },
  });
  await expectOk(ruleRes, 'POST availability-rules');

  const year = target.getFullYear();
  const month = target.getMonth() + 1;
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  await expect
    .poll(
      async () => {
        const res = await adminApi.get(`/resources/${resource.id}/slots`, {
          params: { serviceId: service.id, from, to },
        });
        if (!res.ok()) return false;
        const slots = (await res.json()) as { startTime: string; status: string }[];
        return slots.some((s) => s.startTime.startsWith(dateStr) && s.status !== 'CONFIRMED');
      },
      { timeout: 20_000, message: `nema slobodnog termina za ${dateStr}` },
    )
    .toBe(true);

  return { business, service, resource, dayLabel: String(target.getDate()), dateStr, needsNextMonth };
}

test.describe('E2E-020 rezervacija na telefonu', () => {
  test.describe.configure({ timeout: 120_000 });

  test('ceo tok rezervacije na 390×844 bez horizontalnog skrola, sa dostupnim dugmadima', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const customer = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const ctx = await createBookable(adminApi, ownerId);

      await loginAs(customer);

      const dayButton = page.getByRole('button', { name: ctx.dayLabel, exact: true });
      const serviceTab = page.getByRole('tab', {
        name: new RegExp(escapeRegex(ctx.service.name)),
      });
      const resourceTab = page.getByRole('tab', {
        name: new RegExp(escapeRegex(ctx.resource.name)),
      });

      // Isti postupak kao u E2E-006: ponovno učitavanje dok dugme dana ne postane omogućeno.
      await expect(async () => {
        await page.goto(`/businesses/${ctx.business.id}`);
        await expectNoHorizontalScroll(page, 'detalj biznisa');
        await expectTappable(page, serviceTab, 'tab usluge');
        await serviceTab.click();
        await expectTappable(page, resourceTab, 'tab resursa');
        await resourceTab.click();
        if (ctx.needsNextMonth) {
          const next = page.getByRole('button', { name: 'Next month' });
          await expectTappable(page, next, 'dugme sledeći mesec');
          await next.click();
        }
        await expect(dayButton).toBeEnabled({ timeout: 5_000 });
      }).toPass({ timeout: 60_000, intervals: [1_000] });

      await expectTappable(page, dayButton, 'dugme dana');
      await dayButton.click();

      const slot = page.getByRole('button', { name: '08:00', exact: true });
      await expectTappable(page, slot, 'termin 08:00');
      await expectNoHorizontalScroll(page, 'izbor termina');
      await slot.click();

      const confirm = page.getByRole('button', { name: 'Confirm reservation' });
      await expectTappable(page, confirm, 'dugme Confirm reservation');
      await expectNoHorizontalScroll(page, 'pre potvrde');
      await confirm.click();

      await page.waitForURL(/\/reservation\/[^/]+\/held$/);
      await expect(page.getByText(ctx.business.name, { exact: true })).toBeVisible();
      await expectNoHorizontalScroll(page, 'hold strana');

      await page.goto('/my-reservations');
      await expect(page.getByText(ctx.business.name)).toBeVisible();
      await expect(page.getByText('Pending approval')).toBeVisible();
      await expectNoHorizontalScroll(page, 'Moje rezervacije');
    } finally {
      await adminApi.dispose();
    }
  });
});
