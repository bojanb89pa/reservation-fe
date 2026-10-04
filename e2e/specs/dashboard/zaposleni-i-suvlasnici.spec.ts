// E2E-014 · Zaposleni i suvlasnici
//
// Vlasnik na `/dashboard/businesses/:id` dodaje zaposlenog i suvlasnika (korisnika bira
// kroz pretragu naloga, BE prima email), pa ih uklanja. Dodat član vidi biznis na
// `/dashboard/my-businesses`, a posle uklanjanja ga više ne vidi. Obaveštenje o članstvu
// FE šalje kroz auth-service (`/users/notify-membership`) i stiže u Mailpit.

import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueName } from '../../fixtures/api';
import { waitForEmailContaining } from '../../fixtures/mailpit';

interface PageResponseDto<T> {
  content: T[];
}

interface MembershipDto {
  userId: string | null;
  email: string | null;
}

type Credentials = Awaited<ReturnType<typeof createActivatedUser>>;

async function expectOk(response: APIResponse, label: string): Promise<void> {
  expect(response.ok(), `${label}: HTTP ${response.status()} ${await response.text()}`).toBe(true);
}

// `createActivatedUser()` ne vraća id korisnika, pa se id čita preko admin pretrage naloga.
async function fetchUserId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<{ id: string; email: string }>;
  const match = page.content.find((u) => u.email === email);
  if (!match) {
    throw new Error(`korisnik ${email} nije pronađen u admin pretrazi`);
  }
  return match.id;
}

/** Aktivan biznis (admin kreacija je odmah aktivna) čiji je vlasnik novi nalog. */
async function createOwnedBusiness(): Promise<{
  owner: Credentials;
  businessId: string;
  businessName: string;
}> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const ownerId = await fetchUserId(adminApi, owner.email);
    const businessName = uniqueName('E2E Članovi');
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: businessName,
        ownerId,
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
    await expectOk(created, 'POST /businesses/admin');
    const business = (await created.json()) as { id: string };
    return { owner, businessId: business.id, businessName };
  } finally {
    await adminApi.dispose();
  }
}

function memberSection(page: Page, title: 'Owners' | 'Employees') {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

/** Red člana (ime + dugme "Remove") unutar sekcije; `.last()` je najdublji div koji ih sadrži. */
function memberRow(section: ReturnType<typeof memberSection>, page: Page, fullName: string) {
  return section
    .locator('div')
    .filter({ hasText: fullName })
    .filter({ has: page.getByRole('button', { name: 'Remove' }) })
    .last();
}

/** Odjavljuje trenutnu sesiju (token u localStorage + auth-service kolačić) pre nove prijave. */
async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.context().clearCookies();
}

const ROLES = [
  { title: 'Employees', addButton: '+ Add employee', label: 'zaposlenog' },
  { title: 'Owners', addButton: '+ Add owner', label: 'suvlasnika' },
] as const;

test.describe('E2E-014 zaposleni i suvlasnici', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const { title, addButton, label } of ROLES) {
    test(`vlasnik dodaje ${label}: vidi biznis i mejl stiže, posle uklanjanja ga ne vidi`, async ({
      page,
      loginAs,
    }) => {
      const { owner, businessId, businessName } = await createOwnedBusiness();
      const firstName = uniqueName('Clan').replace(/\s+/g, '');
      const fullName = `${firstName} Testic`;
      const member = await createActivatedUser({ firstName, lastName: 'Testic' });

      await loginAs(owner);
      await page.goto(`/dashboard/businesses/${businessId}`);

      const section = memberSection(page, title);
      await section.getByPlaceholder('Search user by name or email').fill(member.email);
      await section.getByRole('button', { name: member.email }).click();
      await section.getByRole('button', { name: addButton }).click();

      await expect(section.getByText(`Invitation sent to ${member.email}`)).toBeVisible();
      await expect(memberRow(section, page, fullName)).toBeVisible();

      // Obaveštenje o članstvu stiže u Mailpit
      await waitForEmailContaining(member.email, businessName);

      // Dodat član vidi biznis u svom dashboard-u
      await clearSession(page);
      await loginAs(member);
      await page.goto('/dashboard/my-businesses');
      await expect(page.getByText(businessName)).toBeVisible();

      // Vlasnik uklanja člana
      await clearSession(page);
      await loginAs(owner);
      await page.goto(`/dashboard/businesses/${businessId}`);
      const sectionAgain = memberSection(page, title);
      await memberRow(sectionAgain, page, fullName).getByRole('button', { name: 'Remove' }).click();
      await expect(sectionAgain.getByText(fullName)).toHaveCount(0);

      // Posle uklanjanja biznis više nije u njegovom dashboard-u
      await clearSession(page);
      await loginAs(member);
      await page.goto('/dashboard/my-businesses');
      await expect(page.getByText('You are not a member of any business yet.')).toBeVisible();
      await expect(page.getByText(businessName)).toHaveCount(0);
    });
  }

  test('zaposleni ne može da doda suvlasnika', async () => {
    const { owner, businessId } = await createOwnedBusiness();
    const employee = await createActivatedUser();
    const candidate = await createActivatedUser();

    const ownerApi = await ApiClient.as(owner);
    const employeeApi = await ApiClient.as(employee);
    try {
      const added = await ownerApi.post(`/businesses/${businessId}/employees`, {
        data: { email: employee.email },
      });
      await expectOk(added, `POST /businesses/${businessId}/employees`);

      // BE sme da odbije (4xx) ili da ignoriše zahtev; bitno je da suvlasnik nije dodat.
      await employeeApi.post(`/businesses/${businessId}/owners`, {
        data: { email: candidate.email },
      });

      const owners = await ownerApi.get(`/businesses/${businessId}/owners`);
      await expectOk(owners, `GET /businesses/${businessId}/owners`);
      const list = (await owners.json()) as MembershipDto[];
      expect(list.map((m) => m.email)).not.toContain(candidate.email);
    } finally {
      await ownerApi.dispose();
      await employeeApi.dispose();
    }
  });
});
