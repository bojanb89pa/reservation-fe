// E2E-014 · Vlasnik biznisa dodaje zaposlene i suvlasnike po emailu
//
// Epic #43 (kontrolni tiket reservation-agents#43). Pokriva:
//  - `GET /auth/users/search`: admin vidi sve; vlasnik/zaposleni samo članove zajedničkih
//    biznisa; korisnik bez membershipa dobija 403.
//  - `POST /auth/users/notify-membership`: vlasnik samo za svoj biznis; zaposleni i tuđi
//    vlasnik dobijaju 403; adresa koja nije član biznisa se odbija (zaštita od slanja
//    mejlova proizvoljnim adresama).
//  - UI na `/dashboard/businesses/:id`: unos emaila direktno (postojeći i neregistrovan
//    korisnik), predlozi iz pretrage, poruka o poslatom mejlu, mejlovi u Mailpit-u.
//  - Posle uklanjanja član više ne vidi biznis; zaposleni ne može da doda suvlasnika.
//
// Napomena: BE za neovlašćeno dodavanje člana može da vrati 200 bez kreiranja membershipa
// (fe-brief #77), pa se "zaposleni ne može da doda suvlasnika" proverava stanjem liste
// vlasnika, ne samo statusom.

import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from '../../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueEmail, uniqueName } from '../../fixtures/api';
import type { Credentials } from '../../fixtures/api';
import { waitForEmailMatching, type MailpitMessage } from '../../fixtures/mailpit';

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

async function expectStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  expect(
    response.status(),
    `${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`,
  ).toBe(expected);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchUserId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await expectStatus(response, 200, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<UserSummaryDto>;
  const match = page.content.find((u) => u.email === email);
  if (!match) throw new Error(`korisnik ${email} nije pronađen u admin pretrazi`);
  return match.id;
}

/** Aktivan biznis čiji je vlasnik nov nalog (admin kreacija je odmah aktivna). */
async function createOwnedBusiness(): Promise<{ owner: Credentials; business: BusinessDto }> {
  const owner = await createActivatedUser();
  const adminApi = await ApiClient.as(adminCredentials());
  try {
    const ownerId = await fetchUserId(adminApi, owner.email);
    const created = await adminApi.post('/businesses/admin', {
      data: {
        name: uniqueName('E2E Clanstvo'),
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
    await expectStatus(created, 200, 'POST /businesses/admin');
    return { owner, business: (await created.json()) as BusinessDto };
  } finally {
    await adminApi.dispose();
  }
}

async function addMember(
  ownerApi: ApiClient,
  businessId: string,
  role: 'owners' | 'employees',
  email: string,
): Promise<void> {
  const response = await ownerApi.post(`/businesses/${businessId}/${role}`, { data: { email } });
  await expectStatus(response, 200, `POST /businesses/${businessId}/${role}`);
}

async function listMembers(
  api: ApiClient,
  businessId: string,
  role: 'owners' | 'employees',
): Promise<MembershipDto[]> {
  const response = await api.get(`/businesses/${businessId}/${role}`);
  await expectStatus(response, 200, `GET /businesses/${businessId}/${role}`);
  return (await response.json()) as MembershipDto[];
}

async function searchUsers(api: ApiClient, query: string): Promise<APIResponse> {
  return api.auth.get('users/search', { params: { query, limit: 20 } });
}

async function searchEmails(api: ApiClient, query: string): Promise<string[]> {
  const response = await searchUsers(api, query);
  await expectStatus(response, 200, `GET /auth/users/search?query=${query}`);
  return ((await response.json()) as UserSummaryDto[]).map((u) => u.email);
}

function notify(api: ApiClient, businessId: string, email: string): Promise<APIResponse> {
  return api.auth.post('users/notify-membership', { data: { businessId, email } });
}

async function myBusinessIds(api: ApiClient): Promise<string[]> {
  const response = await api.get('/businesses/me', { params: { page: 0, size: 50 } });
  await expectStatus(response, 200, 'GET /businesses/me');
  return ((await response.json()) as PageResponseDto<BusinessDto>).content.map((b) => b.id);
}

function memberSection(page: Page, title: 'Owners' | 'Employees') {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

const SEARCH_PLACEHOLDER = 'Search user by name or email';

const mailText = (message: MailpitMessage) => message.HTML || message.Text;

test.describe('E2E-014 vlasnik dodaje zaposlene i suvlasnike', () => {
  test.describe.configure({ timeout: 120_000 });

  test('pretraga: admin vidi sve, član samo članove zajedničkih biznisa, bez membershipa 403', async () => {
    const { owner, business } = await createOwnedBusiness();
    const employee = await createActivatedUser({ email: uniqueEmail('pretraga-zaposleni') });
    const outsider = await createActivatedUser({ email: uniqueEmail('pretraga-tudji') });
    const loner = await createActivatedUser({ email: uniqueEmail('pretraga-bez-biznisa') });

    const ownerApi = await ApiClient.as(owner);
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      await addMember(ownerApi, business.id, 'employees', employee.email);

      // Vlasnik vidi zaposlenog (isti biznis), ne vidi korisnika van biznisa.
      expect(await searchEmails(ownerApi, employee.email)).toContain(employee.email);
      expect(await searchEmails(ownerApi, outsider.email)).not.toContain(outsider.email);

      // Zaposleni vidi vlasnika, ne vidi tuđeg korisnika.
      const employeeApi = await ApiClient.as(employee);
      try {
        expect(await searchEmails(employeeApi, owner.email)).toContain(owner.email);
        expect(await searchEmails(employeeApi, outsider.email)).not.toContain(outsider.email);
      } finally {
        await employeeApi.dispose();
      }

      // Admin vidi sve.
      expect(await searchEmails(adminApi, outsider.email)).toContain(outsider.email);
      expect(await searchEmails(adminApi, employee.email)).toContain(employee.email);

      // Korisnik bez membershipa dobija 403.
      const lonerApi = await ApiClient.as(loner);
      try {
        await expectStatus(await searchUsers(lonerApi, owner.email), 403, 'GET /auth/users/search (bez membershipa)');
      } finally {
        await lonerApi.dispose();
      }
    } finally {
      await ownerApi.dispose();
      await adminApi.dispose();
    }
  });

  test('pretraga je sveža posle dodavanja i uklanjanja člana', async () => {
    const { owner, business } = await createOwnedBusiness();
    const employee = await createActivatedUser({ email: uniqueEmail('sveza-zaposleni') });

    const ownerApi = await ApiClient.as(owner);
    const employeeApi = await ApiClient.as(employee);
    try {
      // Pre dodavanja zaposleni nije član nijednog biznisa: 403.
      await expectStatus(await searchUsers(employeeApi, owner.email), 403, 'pretraga pre dodavanja');

      await addMember(ownerApi, business.id, 'employees', employee.email);
      // Isti (već izdati) token mora da vidi svež podatak o članstvu.
      expect(await searchEmails(employeeApi, owner.email)).toContain(owner.email);

      const members = await listMembers(ownerApi, business.id, 'employees');
      const userId = members.find((m) => m.email === employee.email || m.userId)?.userId;
      expect(userId, 'zaposleni treba da ima userId').toBeTruthy();
      const removed = await ownerApi.delete(`/businesses/${business.id}/employees/${userId}`);
      expect(removed.ok(), `DELETE employee: HTTP ${removed.status()}`).toBe(true);

      await expect
        .poll(async () => (await searchUsers(employeeApi, owner.email)).status(), {
          message: 'posle uklanjanja pretraga treba da vrati 403',
        })
        .toBe(403);
    } finally {
      await ownerApi.dispose();
      await employeeApi.dispose();
    }
  });

  test('notify-membership: vlasnik samo za svoj biznis, zaposleni i tuđi vlasnik 403', async () => {
    const { owner, business } = await createOwnedBusiness();
    const { owner: otherOwner } = await createOwnedBusiness();
    const employee = await createActivatedUser({ email: uniqueEmail('notify-zaposleni') });
    const stranger = uniqueEmail('notify-nasumicna-adresa');

    const ownerApi = await ApiClient.as(owner);
    const otherOwnerApi = await ApiClient.as(otherOwner);
    const employeeApi = await ApiClient.as(employee);
    try {
      await addMember(ownerApi, business.id, 'employees', employee.email);

      await expectStatus(await notify(ownerApi, business.id, employee.email), 200, 'vlasnik, svoj biznis');
      await expectStatus(await notify(employeeApi, business.id, employee.email), 403, 'zaposleni');
      await expectStatus(await notify(otherOwnerApi, business.id, employee.email), 403, 'tuđi vlasnik');

      // Zaštita od slanja mejlova proizvoljnim adresama: adresa nije član biznisa.
      await expectStatus(await notify(ownerApi, business.id, stranger), 404, 'adresa koja nije član');
    } finally {
      await ownerApi.dispose();
      await otherOwnerApi.dispose();
      await employeeApi.dispose();
    }
  });

  test('vlasnik u UI-ju dodaje postojećeg korisnika po emailu; član dobija mejl i vidi biznis', async ({
    page,
    loginAs,
  }) => {
    const { owner, business } = await createOwnedBusiness();
    const lastName = uniqueName('Zaposleni').replace(' ', '');
    const employee = await createActivatedUser({ email: uniqueEmail('ui-zaposleni'), lastName });

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    const section = memberSection(page, 'Employees');
    await section.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(employee.email);
    // Prazna lista predloga ne sme da blokira unos niti da deluje kao greška.
    await section.getByRole('button', { name: '+ Add employee' }).click();

    await expect(section.getByText(`Invitation sent to ${employee.email}`)).toBeVisible();
    await expect(section.getByText(lastName)).toBeVisible();
    await expect(section.getByText('Failed to add member.')).toHaveCount(0);

    const mail = await waitForEmailMatching(employee.email, (m) => mailText(m).includes(business.name));
    expect(mailText(mail)).toContain(business.name);

    const employeeApi = await ApiClient.as(employee);
    try {
      expect(await myBusinessIds(employeeApi)).toContain(business.id);
    } finally {
      await employeeApi.dispose();
    }
    await loginAs(employee);
    await page.goto('/dashboard/my-businesses');
    await expect(
      page.getByRole('link', { name: new RegExp(escapeRegex(business.name)) }),
    ).toBeVisible();
  });

  test('vlasnik u UI-ju dodaje neregistrovan email; stiže pozivnica drugačija od mejla za postojećeg korisnika', async ({
    page,
    loginAs,
  }) => {
    const { owner, business } = await createOwnedBusiness();
    const existing = await createActivatedUser({ email: uniqueEmail('ui-postojeci') });
    const unregistered = uniqueEmail('ui-neregistrovan');

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    const section = memberSection(page, 'Owners');

    await section.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(unregistered);
    await section.getByRole('button', { name: '+ Add owner' }).click();
    await expect(section.getByText(`Invitation sent to ${unregistered}`)).toBeVisible();
    await expect(section.getByText(unregistered, { exact: true })).toBeVisible();

    await section.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(existing.email);
    await section.getByRole('button', { name: '+ Add owner' }).click();
    await expect(section.getByText(`Invitation sent to ${existing.email}`)).toBeVisible();

    const hasBusiness = (m: MailpitMessage) => mailText(m).includes(business.name);
    const invitation = await waitForEmailMatching(unregistered, hasBusiness);
    const notice = await waitForEmailMatching(existing.email, hasBusiness);

    const normalize = (m: MailpitMessage, address: string) =>
      `${m.Subject}\n${mailText(m)}`.split(address).join('<adresa>');
    expect(
      normalize(invitation, unregistered),
      'pozivnica za registraciju treba da ima drugačiji sadržaj od obaveštenja o članstvu',
    ).not.toEqual(normalize(notice, existing.email));
  });

  test('predlozi iz pretrage nude člana zajedničkog biznisa, a email van predloga se i dalje može uneti', async ({
    page,
    loginAs,
  }) => {
    const { owner, business } = await createOwnedBusiness();
    const coMember = await createActivatedUser({ email: uniqueEmail('predlog-clan') });
    const newcomer = await createActivatedUser({ email: uniqueEmail('predlog-novi') });

    const ownerApi = await ApiClient.as(owner);
    try {
      await addMember(ownerApi, business.id, 'employees', coMember.email);
    } finally {
      await ownerApi.dispose();
    }

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    const owners = memberSection(page, 'Owners');
    const input = owners.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

    // Postojeći član biznisa se nudi kao predlog i može da se izabere (suvlasnik).
    await input.fill(coMember.email);
    await owners.getByRole('button', { name: new RegExp(escapeRegex(coMember.email)) }).click();
    await owners.getByRole('button', { name: '+ Add owner' }).click();
    await expect(owners.getByText(`Invitation sent to ${coMember.email}`)).toBeVisible();

    // Korisnik koji nije u predlozima (nema zajednički biznis) ručno se unosi.
    await input.fill(newcomer.email);
    await expect(owners.getByRole('button', { name: new RegExp(escapeRegex(newcomer.email)) })).toHaveCount(0);
    await owners.getByRole('button', { name: '+ Add owner' }).click();
    await expect(owners.getByText(`Invitation sent to ${newcomer.email}`)).toBeVisible();
    await expect(owners.getByText('Failed to add member.')).toHaveCount(0);
  });

  test('posle uklanjanja član više ne vidi biznis', async ({ page, loginAs }) => {
    const { owner, business } = await createOwnedBusiness();
    const lastName = uniqueName('Uklanjanje').replace(' ', '');
    const employee = await createActivatedUser({ email: uniqueEmail('uklanjanje-zaposleni'), lastName });

    const ownerApi = await ApiClient.as(owner);
    const employeeApi = await ApiClient.as(employee);
    try {
      await addMember(ownerApi, business.id, 'employees', employee.email);
      expect(await myBusinessIds(employeeApi)).toContain(business.id);
    } finally {
      await ownerApi.dispose();
    }

    await loginAs(owner);
    await page.goto(`/dashboard/businesses/${business.id}`);
    const section = memberSection(page, 'Employees');
    await expect(section.getByText(lastName)).toBeVisible();
    await section.getByRole('button', { name: 'Remove' }).click();
    await expect(section.getByText('No employees yet.')).toBeVisible();

    try {
      await expect
        .poll(async () => myBusinessIds(employeeApi), {
          message: 'uklonjeni zaposleni ne treba da vidi biznis u /businesses/me',
        })
        .not.toContain(business.id);
    } finally {
      await employeeApi.dispose();
    }
  });

  test('zaposleni ne može da doda suvlasnika', async () => {
    const { owner, business } = await createOwnedBusiness();
    const employee = await createActivatedUser({ email: uniqueEmail('suvlasnik-zaposleni') });
    const candidate = await createActivatedUser({ email: uniqueEmail('suvlasnik-kandidat') });

    const ownerApi = await ApiClient.as(owner);
    const employeeApi = await ApiClient.as(employee);
    try {
      await addMember(ownerApi, business.id, 'employees', employee.email);

      const attempt = await employeeApi.post(`/businesses/${business.id}/owners`, {
        data: { email: candidate.email },
      });
      // BE može da odbije (403) ili da vrati isti oblik bez kreiranja (fe-brief #77);
      // u oba slučaja kandidat ne sme da postane vlasnik niti da vidi biznis.
      expect([200, 403], `HTTP ${attempt.status()} ${await attempt.text()}`).toContain(attempt.status());

      const owners = await listMembers(ownerApi, business.id, 'owners');
      expect(owners.map((m) => m.email)).not.toContain(candidate.email);

      const candidateApi = await ApiClient.as(candidate);
      try {
        expect(await myBusinessIds(candidateApi)).not.toContain(business.id);
      } finally {
        await candidateApi.dispose();
      }
    } finally {
      await ownerApi.dispose();
      await employeeApi.dispose();
    }
  });
});
