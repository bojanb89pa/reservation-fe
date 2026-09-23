// epic:21 · Prazan naziv lokacije pri pravljenju biznisa/lokacije daje 400 bez poruke
//
// Do ovog epica je `CreateBusinessLocationCommand.name` bio opciono polje na
// FE-u, a dugme za čuvanje je proveravalo samo lat/lng — prazan naziv lokacije
// je tiho prošao kroz FE i BE je vraćao 400 bez poruke (BE `name` je
// `@NotBlank`, pa Jackson padne pre validacije i nema poruke u odgovoru).
// Testovi ispod provere da su dugmad za čuvanje sad onemogućena i da je
// validaciona poruka vidljiva dok je naziv lokacije prazan — i u formi za
// novi biznis (dashboard → Biznisi), i u formi za dodavanje lokacije
// postojećem biznisu (detalj biznisa) — kao i da BE ugovor i dalje odbija
// zahtev bez naziva ako bi ikad stigao do njega.
//
// Kontrolni tiket: https://github.com/bojanb89pa/reservation-agents/issues/21

import type { APIResponse } from '@playwright/test';
import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../fixtures/api';

interface BusinessDto {
  id: string;
  name: string;
}

interface PageResponseDto<T> {
  content: T[];
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
 * preko admin pretrage naloga (isto kao u prikaz-adrese-lokacije.spec.ts).
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

function validLocationPayload() {
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
async function createActiveBusiness(adminApi: ApiClient, ownerId: string): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name: uniqueName('E2E Naziv lokacije'), ownerId, location: validLocationPayload() },
  });
  await expectStatus(created, 200, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

test.describe('epic:21 prazan naziv lokacije pri pravljenju biznisa/lokacije', () => {
  test('onboarding → novi biznis: dugme za slanje je onemogućeno i vidljiva je poruka dok je naziv lokacije prazan', async ({
    page,
    user,
    loginAs,
  }) => {
    // Nov korisnik nema aktivan biznis, pa ga DashboardLayout ionako šalje na
    // /business-onboarding — to je njegova forma za pravljenje biznisa.
    await loginAs(user);
    await page.goto('/business-onboarding');

    await page.getByRole('textbox', { name: 'Maison Kohl' }).fill(uniqueName('E2E Biznis'));

    const locationNameInput = page.getByRole('textbox', { name: 'Main branch' });
    await expect(locationNameInput).toHaveValue('');
    await expect(page.getByText('Branch name is required.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit for review' })).toBeDisabled();

    await locationNameInput.fill(uniqueName('Lokacija'));
    await expect(page.getByText('Branch name is required.')).not.toBeVisible();
    // Adresa/mesto još nije izabrano (ne diramo Google Places u E2E-u — vidi
    // GOOGLE_PLACES_API_KEY=e2e-unused u compose.e2e.yml), pa dugme ostaje
    // onemogućeno i posle unosa naziva — to je odvojen uslov, nepromenjen ovim
    // tiketom.
    await expect(page.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
  });

  test('dashboard → novi biznis: dugme za čuvanje je onemogućeno i vidljiva je poruka dok je naziv lokacije prazan', async ({
    page,
    loginAs,
  }) => {
    // Dashboard je dostupan samo vlasniku sa bar jednim aktivnim biznisom
    // (DashboardLayout inače preusmerava na /business-onboarding).
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      await createActiveBusiness(adminApi, ownerId);
    } finally {
      await adminApi.dispose();
    }

    await loginAs(owner);
    await page.goto('/dashboard/businesses');

    await page.getByRole('button', { name: '+ New business' }).click();
    await page.getByRole('textbox', { name: 'Maison Kohl' }).fill(uniqueName('E2E Biznis'));

    const locationNameInput = page.getByRole('textbox', { name: 'Main branch' });
    await expect(locationNameInput).toHaveValue('');
    await expect(page.getByText('Branch name is required.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create business' })).toBeDisabled();

    await locationNameInput.fill(uniqueName('Lokacija'));
    await expect(page.getByText('Branch name is required.')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Create business' })).toBeDisabled();
  });

  test('detalj biznisa → dodaj lokaciju: dugme za čuvanje je onemogućeno i vidljiva je poruka dok je naziv prazan', async ({
    page,
    loginAs,
  }) => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const business = await createActiveBusiness(adminApi, ownerId);

      await loginAs(owner);
      await page.goto(`/dashboard/businesses/${business.id}`);

      await page.getByRole('button', { name: '+ Add location' }).click();

      const locationNameInput = page.getByRole('textbox', { name: 'Dorćol' });
      await expect(locationNameInput).toHaveValue('');
      await expect(page.getByText('Branch name is required.')).toBeVisible();
      await expect(page.getByRole('button', { name: '+ Add location' })).toBeDisabled();

      await locationNameInput.fill(uniqueName('Nova lokacija'));
      await expect(page.getByText('Branch name is required.')).not.toBeVisible();
      await expect(page.getByRole('button', { name: '+ Add location' })).toBeDisabled();
    } finally {
      await adminApi.dispose();
    }
  });

  test('BE ugovor i dalje odbija (400) zahtev bez naziva lokacije, i pri pravljenju biznisa i pri dodavanju lokacije', async () => {
    const owner = await createActivatedUser();
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerApi = await ApiClient.as(owner);
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      const { name: _omitted, ...locationWithoutName } = validLocationPayload();

      const createWithoutName = await adminApi.post('/businesses/admin', {
        data: {
          name: uniqueName('E2E Bez naziva lokacije'),
          ownerId,
          location: locationWithoutName,
        },
      });
      await expectStatus(createWithoutName, 400, 'POST /businesses/admin (location bez name)');

      const business = await createActiveBusiness(adminApi, ownerId);
      const addLocationWithoutName = await ownerApi.post(`/businesses/${business.id}/locations`, {
        data: locationWithoutName,
      });
      await expectStatus(
        addLocationWithoutName,
        400,
        `POST /businesses/${business.id}/locations (bez name)`,
      );
    } finally {
      await adminApi.dispose();
      await ownerApi.dispose();
    }
  });
});
