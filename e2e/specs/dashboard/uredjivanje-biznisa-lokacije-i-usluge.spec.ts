// E2E-012 · Uređivanje biznisa: lokacije i usluge
//
// Vlasnik na `/dashboard/businesses/:id` dodaje lokaciju, pravi uslugu (fiksno
// trajanje ili raspon), menja je i briše. Javni prikaz usluge je tab u
// BookingWidget-u na `/businesses/:id` ("<naziv> · 45min" ili "<naziv> · 30–60min").
//
// Lokacija se ne dodaje kroz formu: ona traži izbor mesta preko Google Places,
// a E2E stack nema pravi ključ (GOOGLE_PLACES_API_KEY=e2e-unused u
// compose.e2e.yml). Zato se lokacija pravi API pozivom vlasnika
// (`POST /businesses/:id/locations`, isto telo kao u prazan-naziv-lokacije.spec.ts),
// a test proverava da je vlasnik vidi u dashboard-u. Javni prikaz adrese
// pokriva prikaz-adrese-lokacije.spec.ts (epic #20).
//
// Napomena o kriterijumu "trajanje 0": numerički inputi u ServiceForm-u
// (`clampInt`) tiho podižu vrednost na 1, pa se 0 ne može uneti kroz UI.
// Greška uz polje se zato proverava na opsegu koji forma stvarno odbija
// (max < min, (max − min) nije umnožak koraka).

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
}

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

function locationPayload(name: string) {
  return {
    name,
    addressLine1: uniqueName('Ulica'),
    city: 'Novi Sad',
    postalCode: '21000',
    countryCode: 'RS',
    latitude: 45.2671,
    longitude: 19.8335,
  };
}

/** Aktivan biznis (admin kreacija je odmah aktivna) čiji je vlasnik novi nalog. */
async function createOwnedBusiness(): Promise<{
  owner: Awaited<ReturnType<typeof createActivatedUser>>;
  business: BusinessDto;
}> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const ownerId = await fetchOwnerId(adminApi, owner.email);
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E Uređivanje'),
        ownerId,
        location: locationPayload(uniqueName('Početna lokacija')),
      },
    });
    await expectOk(created, 'POST /businesses/admin');
    return { owner, business: (await created.json()) as BusinessDto };
  } finally {
    await adminApi.dispose();
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('E2E-012 uređivanje biznisa: lokacije i usluge', () => {
  test.describe.configure({ timeout: 90_000 });

  test('nova lokacija se vidi u dashboard-u vlasnika', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const locationName = uniqueName('Nova lokacija');

    const ownerApi = await ApiClient.as(owner);
    try {
      const created = await ownerApi.post(`/businesses/${business.id}/locations`, {
        data: locationPayload(locationName),
      });
      await expectOk(created, `POST /businesses/${business.id}/locations`);
    } finally {
      await ownerApi.dispose();
    }

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    await expect(page.getByText(locationName)).toBeVisible();
  });

  test('nova usluga fiksnog trajanja se vidi javno sa ispravnim trajanjem', async ({
    page,
    loginAs,
  }) => {
    const { owner, business } = await createOwnedBusiness();
    const serviceName = uniqueName('Usluga');

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    await page.getByRole('button', { name: '+ Add service' }).click();
    await page.getByLabel('Name', { exact: true }).fill(serviceName);
    await page.getByLabel('Duration', { exact: true }).fill('45');
    await page.getByRole('button', { name: 'Create service' }).click();

    const row = page.getByTestId('service-row').filter({ hasText: serviceName });
    await expect(row).toContainText('45 Minutes');

    await page.goto(`/businesses/${business.id}`);
    const tab = page.getByRole('tab', { name: new RegExp(escapeRegex(serviceName)) });
    await expect(tab).toBeVisible();
    await expect(tab).toContainText('45min');
  });

  test('nova usluga sa rasponom trajanja se vidi javno sa rasponom', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const serviceName = uniqueName('Usluga raspon');

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    await page.getByRole('button', { name: '+ Add service' }).click();
    await page.getByLabel('Name', { exact: true }).fill(serviceName);
    await page.getByRole('tab', { name: 'Let customer choose' }).click();
    await page.getByLabel('Min', { exact: true }).fill('30');
    await page.getByLabel('Max', { exact: true }).fill('60');
    await page.getByLabel('Step', { exact: true }).fill('15');
    await page.getByRole('button', { name: 'Create service' }).click();

    const row = page.getByTestId('service-row').filter({ hasText: serviceName });
    await expect(row).toContainText('30–60 Minutes · step 15');

    await page.goto(`/businesses/${business.id}`);
    const tab = page.getByRole('tab', { name: new RegExp(escapeRegex(serviceName)) });
    await expect(tab).toBeVisible();
    await expect(tab).toContainText('30–60min');
  });

  test('izmena usluge se odmah vidi javno', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const serviceName = uniqueName('Usluga za izmenu');
    const renamed = uniqueName('Usluga izmenjena');

    const ownerApi = await ApiClient.as(owner);
    try {
      const created = await ownerApi.post(`/businesses/${business.id}/services`, {
        data: {
          name: serviceName,
          minDuration: 30,
          maxDuration: 30,
          durationUnit: 'MINUTES',
          durationStep: 1,
        },
      });
      await expectOk(created, `POST /businesses/${business.id}/services`);
    } finally {
      await ownerApi.dispose();
    }

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    const row = page.getByTestId('service-row').filter({ hasText: serviceName });
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Name', { exact: true }).fill(renamed);
    await page.getByLabel('Duration', { exact: true }).fill('60');
    await page.getByRole('button', { name: 'Save changes' }).click();

    const updatedRow = page.getByTestId('service-row').filter({ hasText: renamed });
    await expect(updatedRow).toContainText('60 Minutes');

    await page.goto(`/businesses/${business.id}`);
    const tab = page.getByRole('tab', { name: new RegExp(escapeRegex(renamed)) });
    await expect(tab).toBeVisible();
    await expect(tab).toContainText('60min');
    await expect(
      page.getByRole('tab', { name: new RegExp(escapeRegex(serviceName)) }),
    ).toHaveCount(0);
  });

  test('brisanje usluge se odmah vidi javno', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const serviceName = uniqueName('Usluga za brisanje');
    const keptName = uniqueName('Usluga ostaje');

    const ownerApi = await ApiClient.as(owner);
    try {
      for (const name of [serviceName, keptName]) {
        const created = await ownerApi.post(`/businesses/${business.id}/services`, {
          data: { name, minDuration: 30, maxDuration: 30, durationUnit: 'MINUTES', durationStep: 1 },
        });
        await expectOk(created, `POST /businesses/${business.id}/services`);
      }
    } finally {
      await ownerApi.dispose();
    }

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    const row = page.getByTestId('service-row').filter({ hasText: serviceName });
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByTestId('delete-service-dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0);

    await page.goto(`/businesses/${business.id}`);
    // Preostala usluga potvrđuje da se javna lista učitala pre asercije o obrisanoj.
    await expect(page.getByRole('tab', { name: new RegExp(escapeRegex(keptName)) })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: new RegExp(escapeRegex(serviceName)) }),
    ).toHaveCount(0);
  });

  test('neispravan raspon trajanja prikazuje grešku i ne pravi uslugu', async ({
    page,
    loginAs,
  }) => {
    const { owner, business } = await createOwnedBusiness();
    const serviceName = uniqueName('Usluga neispravna');

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    await page.getByRole('button', { name: '+ Add service' }).click();
    await page.getByLabel('Name', { exact: true }).fill(serviceName);
    await page.getByRole('tab', { name: 'Let customer choose' }).click();
    await page.getByLabel('Min', { exact: true }).fill('10');
    await page.getByLabel('Max', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Create service' }).click();

    await expect(page.getByText('(Max − Min) must be a whole multiple of Step.')).toBeVisible();
    await expect(page.getByTestId('service-row').filter({ hasText: serviceName })).toHaveCount(0);

    // Raspon koji nije umnožak koraka (29 % 4 ≠ 0) takođe se odbija.
    await page.getByLabel('Min', { exact: true }).fill('1');
    await page.getByLabel('Max', { exact: true }).fill('30');
    await page.getByLabel('Step', { exact: true }).fill('4');
    await page.getByRole('button', { name: 'Create service' }).click();
    await expect(page.getByText('(Max − Min) must be a whole multiple of Step.')).toBeVisible();
    await expect(page.getByTestId('service-row').filter({ hasText: serviceName })).toHaveCount(0);
  });
});
