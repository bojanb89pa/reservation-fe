// Epic #117 · Dodavanje vlasnika/zaposlenog bez prava vraća 403 umesto lažnog 200
//
// Pokriva kriterijume iz kontrolnog tiketa reservation-agents#117:
//  - nevlasnik/ne-admin dobija 403, ništa se ne snima i mejl ne ide;
//  - admin i vlasnik rade kao ranije (uključujući 409 za postojećeg člana);
//  - FE u sekciji članova prikazuje poruku o nedostatku prava za 403.

import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueEmail, uniqueName } from '../../fixtures/api';
import type { Credentials } from '../../fixtures/api';
import { waitForEmailMatching } from '../../fixtures/mailpit';

interface BusinessDto {
  id: string;
  name: string;
}

interface MembershipDto {
  id: string;
  userId: string | null;
  email: string | null;
}

interface UserSummaryDto {
  id: string;
  email: string;
}

interface PageResponseDto<T> {
  content: T[];
}

type Role = 'owners' | 'employees';

async function expectStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  expect(
    response.status(),
    `${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`,
  ).toBe(expected);
}

async function createOwnedBusiness(): Promise<{ owner: Credentials; business: BusinessDto }> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const accounts = await adminApi.auth.get('users/admin/accounts', { params: { search: owner.email } });
    await expectStatus(accounts, 200, 'GET /auth/users/admin/accounts');
    const found = ((await accounts.json()) as PageResponseDto<UserSummaryDto>).content.find(
      (u) => u.email === owner.email,
    );
    if (!found) throw new Error(`korisnik ${owner.email} nije pronađen u admin pretrazi`);
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E BezPrava'),
        ownerId: found.id,
        location: {
          name: uniqueName('Lokacija'),
          addressLine1: uniqueName('Ulica'),
          city: 'Novi Sad',
          postalCode: '21000',
          countryCode: 'RS',
          latitude: 45.2671,
          longitude: 19.8335,
        },
      },
    });
    await expectStatus(created, 200, 'POST /businesses/admin');
    return { owner, business: (await created.json()) as BusinessDto };
  } finally {
    await adminApi.dispose();
  }
}

async function listEmails(api: ApiClient, businessId: string, role: Role): Promise<(string | null)[]> {
  const response = await api.get(`/businesses/${businessId}/${role}`);
  await expectStatus(response, 200, `GET /businesses/${businessId}/${role}`);
  return ((await response.json()) as MembershipDto[]).map((m) => m.email);
}

async function myBusinessIds(api: ApiClient): Promise<string[]> {
  const response = await api.get('/businesses/me', { params: { page: 0, size: 50 } });
  await expectStatus(response, 200, 'GET /businesses/me');
  return ((await response.json()) as PageResponseDto<BusinessDto>).content.map((b) => b.id);
}

function memberSection(page: Page, title: 'Owners' | 'Employees') {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

const SEARCH_PLACEHOLDER = 'Search user by name or email';
const FORBIDDEN_MESSAGE = 'You do not have permission to add members to this business.';

test.describe('Dodavanje člana bez prava vraća 403', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const role of ['owners', 'employees'] as const) {
    test(`API: nevlasnik i zaposleni dobijaju 403 na POST /${role}, ništa se ne snima`, async () => {
      const { owner, business } = await createOwnedBusiness();
      const employee = await createActivatedUser({ email: uniqueEmail(`bez-prava-zaposleni-${role}`) });
      const outsider = await createActivatedUser({ email: uniqueEmail(`bez-prava-tudji-${role}`) });
      const candidate = await createActivatedUser({ email: uniqueEmail(`bez-prava-kandidat-${role}`) });

      const ownerApi = await ApiClient.as(owner);
      const employeeApi = await ApiClient.as(employee);
      const outsiderApi = await ApiClient.as(outsider);
      try {
        await expectStatus(
          await ownerApi.post(`/businesses/${business.id}/employees`, { data: { email: employee.email } }),
          200,
          'vlasnik dodaje zaposlenog',
        );

        await expectStatus(
          await outsiderApi.post(`/businesses/${business.id}/${role}`, { data: { email: candidate.email } }),
          403,
          `tuđi korisnik, POST /${role}`,
        );
        await expectStatus(
          await employeeApi.post(`/businesses/${business.id}/${role}`, { data: { email: candidate.email } }),
          403,
          `zaposleni, POST /${role}`,
        );

        expect(await listEmails(ownerApi, business.id, role)).not.toContain(candidate.email);
        const candidateApi = await ApiClient.as(candidate);
        try {
          expect(await myBusinessIds(candidateApi)).not.toContain(business.id);
        } finally {
          await candidateApi.dispose();
        }
      } finally {
        await ownerApi.dispose();
        await employeeApi.dispose();
        await outsiderApi.dispose();
      }
    });

    test(`API: vlasnik i admin dodaju na POST /${role}, postojeći član daje 409`, async () => {
      const { owner, business } = await createOwnedBusiness();
      const byOwner = await createActivatedUser({ email: uniqueEmail(`prava-vlasnik-${role}`) });
      const byAdmin = await createActivatedUser({ email: uniqueEmail(`prava-admin-${role}`) });

      const ownerApi = await ApiClient.as(owner);
      const adminApi = await ApiClient.as(adminCredentials());
      try {
        await expectStatus(
          await ownerApi.post(`/businesses/${business.id}/${role}`, { data: { email: byOwner.email } }),
          200,
          'vlasnik dodaje',
        );
        await expectStatus(
          await adminApi.post(`/businesses/${business.id}/${role}`, { data: { email: byAdmin.email } }),
          200,
          'admin dodaje',
        );
        const emails = await listEmails(ownerApi, business.id, role);
        expect(emails).toContain(byOwner.email);
        expect(emails).toContain(byAdmin.email);

        await expectStatus(
          await ownerApi.post(`/businesses/${business.id}/${role}`, { data: { email: byOwner.email } }),
          409,
          'vlasnik ponovo dodaje postojećeg člana',
        );
      } finally {
        await ownerApi.dispose();
        await adminApi.dispose();
      }
    });
  }

  test('UI: zaposleni vidi poruku o nedostatku prava umesto „Invitation sent“', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const employee = await createActivatedUser({ email: uniqueEmail('ui-bez-prava-zaposleni') });
    const candidate = await createActivatedUser({ email: uniqueEmail('ui-bez-prava-kandidat') });

    const ownerApi = await ApiClient.as(owner);
    try {
      await expectStatus(
        await ownerApi.post(`/businesses/${business.id}/employees`, { data: { email: employee.email } }),
        200,
        'vlasnik dodaje zaposlenog',
      );

      await loginAs(employee);
      await page.goto(`/dashboard/businesses/${business.id}`);
      const section = memberSection(page, 'Owners');
      await section.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(candidate.email);
      await section.getByRole('button', { name: '+ Add owner' }).click();

      await expect(section.getByRole('alert')).toHaveText(FORBIDDEN_MESSAGE);
      await expect(section.getByText(/Invitation sent to/)).toHaveCount(0);

      expect(await listEmails(ownerApi, business.id, 'owners')).not.toContain(candidate.email);
    } finally {
      await ownerApi.dispose();
    }
  });

  test('API: odbijeno dodavanje ne šalje mejl o biznisu kandidatu', async () => {
    const { business } = await createOwnedBusiness();
    const outsider = await createActivatedUser({ email: uniqueEmail('bez-mejla-tudji') });
    const candidate = await createActivatedUser({ email: uniqueEmail('bez-mejla-kandidat') });

    const outsiderApi = await ApiClient.as(outsider);
    try {
      await expectStatus(
        await outsiderApi.post(`/businesses/${business.id}/employees`, { data: { email: candidate.email } }),
        403,
        'tuđi korisnik, POST /employees',
      );
    } finally {
      await outsiderApi.dispose();
    }

    // Kontrola da Mailpit radi (aktivacioni mejl kandidata), pa tek onda provera da mejla o biznisu nema.
    await waitForEmailMatching(candidate.email, () => true);
    const received = await waitForEmailMatching(candidate.email, (m) =>
      (m.HTML || m.Text).includes(business.name),
    ).then(
      () => true,
      () => false,
    );
    expect(received, 'kandidat ne sme da dobije mejl o biznisu posle odbijenog dodavanja').toBe(false);
  });
});
