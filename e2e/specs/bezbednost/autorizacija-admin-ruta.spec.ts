// E2E-008 · Autorizacija admin ruta
//
// Preduslov (spojen u main): logs/fe-brief-admin-endpoint-preauthorize-fix-20260922-1200.md
// — `@EnableMethodSecurity` je bio isključen, pa je `@PreAuthorize("hasRole('ADMIN')")` bio tiho
// ignorisan i bilo koji ulogovan korisnik je mogao da pozove admin rute. Testovi ispod proveravaju
// da su te rute sada stvarno zaštićene: 401 bez tokena, 403 za običnog korisnika, 2xx za
// `seed-admin` (sa podacima koje test sam napravi i obriše), i da FE dashboard ne prikazuje admin
// stavke (Categories, Users) običnom korisniku niti mu dozvoljava direktan pristup preko URL-a.

import type { APIResponse } from '@playwright/test';
import { env } from '../../env';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueEmail, uniqueName } from '../../fixtures/api';

interface BusinessDto {
  id: string;
  status: string;
}

interface UserDto {
  id: string;
  email: string;
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

function newAdminAccountPayload() {
  return {
    email: uniqueEmail('admin'),
    password: env.userPassword,
    firstName: 'E2E',
    lastName: 'Admin',
  };
}

function uniqueLocationPayload() {
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

/** `POST /businesses/admin` traži pravi `User.id`, ne JWT `sub` claim — čita se preko admin pretrage naloga. */
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

/** Aktivan biznis sa jednom lokacijom (admin kreacija je odmah aktivna). */
async function createActiveBusiness(adminApi: ApiClient, ownerId: string): Promise<BusinessDto> {
  const created = await adminApi.post('/businesses/admin', {
    data: { name: uniqueName('E2E Admin Auth'), ownerId, location: uniqueLocationPayload() },
  });
  await expectStatus(created, 200, 'POST /businesses/admin');
  return (await created.json()) as BusinessDto;
}

test.describe('E2E-008 autorizacija admin ruta', () => {
  test('401 bez tokena na admin rutama', async ({ anonymousApi }) => {
    const randomBusinessId = crypto.randomUUID();

    const createAdmin = await anonymousApi.auth.post('users/admin', { data: newAdminAccountPayload() });
    await expectStatus(createAdmin, 401, 'POST /auth/users/admin (bez tokena)');

    const listBusinesses = await anonymousApi.get('/businesses/admin');
    await expectStatus(listBusinesses, 401, 'GET /businesses/admin (bez tokena)');

    const activate = await anonymousApi.post(`/businesses/${randomBusinessId}/activate`);
    await expectStatus(activate, 401, `POST /businesses/${randomBusinessId}/activate (bez tokena)`);

    const deleteBusiness = await anonymousApi.delete(`/businesses/${randomBusinessId}`);
    await expectStatus(deleteBusiness, 401, `DELETE /businesses/${randomBusinessId} (bez tokena)`);
  });

  test('403 za običnog korisnika na admin rutama', async () => {
    const user = await createActivatedUser();
    const userApi = await ApiClient.as(user);
    try {
      const randomBusinessId = crypto.randomUUID();

      const createAdmin = await userApi.auth.post('users/admin', { data: newAdminAccountPayload() });
      await expectStatus(createAdmin, 403, 'POST /auth/users/admin (običan korisnik)');

      const listBusinesses = await userApi.get('/businesses/admin');
      await expectStatus(listBusinesses, 403, 'GET /businesses/admin (običan korisnik)');

      const activate = await userApi.post(`/businesses/${randomBusinessId}/activate`);
      await expectStatus(
        activate,
        403,
        `POST /businesses/${randomBusinessId}/activate (običan korisnik)`,
      );

      const deleteBusiness = await userApi.delete(`/businesses/${randomBusinessId}`);
      await expectStatus(deleteBusiness, 403, `DELETE /businesses/${randomBusinessId} (običan korisnik)`);
    } finally {
      await userApi.dispose();
    }
  });

  test('seed-admin dobija 2xx na admin rutama, sa podacima koje test sam napravi i obriše', async () => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    let createdAdminId: string | undefined;
    let createdBusinessId: string | undefined;
    try {
      const createAdmin = await adminApi.auth.post('users/admin', { data: newAdminAccountPayload() });
      await expectStatus(createAdmin, 200, 'POST /auth/users/admin (seed-admin)');
      createdAdminId = ((await createAdmin.json()) as UserDto).id;

      const listBusinesses = await adminApi.get('/businesses/admin', { params: { page: 0, size: 20 } });
      await expectStatus(listBusinesses, 200, 'GET /businesses/admin (seed-admin)');

      const submitted = await ownerApi.post('/businesses/submit', {
        data: { name: uniqueName('E2E Admin Auth'), location: uniqueLocationPayload() },
      });
      await expectStatus(submitted, 200, 'POST /businesses/submit (priprema — biznis na čekanju)');
      const business = (await submitted.json()) as BusinessDto;
      createdBusinessId = business.id;
      expect(business.status).toBe('PENDING');

      const activated = await adminApi.post(`/businesses/${business.id}/activate`);
      await expectStatus(activated, 200, `POST /businesses/${business.id}/activate (seed-admin)`);
      expect(((await activated.json()) as BusinessDto).status).toBe('ACTIVE');

      const deleted = await adminApi.delete(`/businesses/${business.id}`);
      await expectStatus(deleted, 200, `DELETE /businesses/${business.id} (seed-admin)`);
      expect(((await deleted.json()) as BusinessDto).status).toBe('DELETED');
      createdBusinessId = undefined;
    } finally {
      if (createdAdminId) {
        await adminApi.auth.delete(`users/admin/accounts/${createdAdminId}`);
      }
      if (createdBusinessId) {
        await adminApi.delete(`/businesses/${createdBusinessId}`);
      }
      await adminApi.dispose();
      await ownerApi.dispose();
    }
  });

  test('običan korisnik ne vidi admin stavke u dashboard-u i direktan URL mu ih ne otvara', async ({
    page,
    loginAs,
  }) => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchOwnerId(adminApi, owner.email);
      // Vlasnik mora imati aktivan biznis, inače DashboardLayout ionako šalje na
      // /business-onboarding pre nego što AdminRoute stigne da odluči — ovim
      // izolujemo baš admin-only gejt, ne opšte pravilo o onboardingu.
      await createActiveBusiness(adminApi, ownerId);

      await loginAs(owner);
      await page.goto('/dashboard');
      await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Categories', exact: true })).not.toBeVisible();
      await expect(page.getByRole('link', { name: 'Users', exact: true })).not.toBeVisible();

      await page.goto('/dashboard/categories');
      await page.waitForURL((url) => url.pathname === '/dashboard');

      await page.goto('/dashboard/users');
      await page.waitForURL((url) => url.pathname === '/dashboard');
    } finally {
      await adminApi.dispose();
    }
  });
});
