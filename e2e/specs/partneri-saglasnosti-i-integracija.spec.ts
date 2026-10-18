// epic:67 · Faza 2 / A: partneri sa sopstvenim loginom
//
// Pokriveno: admin lista/detalj/izmena integracije (API + UI), saglasnosti po
// lokaciji (vlasnik odobrava/opoziva, izolacija vlasnika), javni widget-config i
// integration endpoint-i bez tajni, i odbijanje token exchange-a koje ne traži
// spoljnog izdavaoca.
//
// NIJE pokriveno (traži izmenu `compose.e2e.yml`, van dozvoljenog opsega ovog
// agenta): uspešna zamena ID tokena, claim-ovi/scope presek, vezivanje po
// (issuer, subject)/Google sub, vlasništvo rezervacije (404) i rezervacija
// 201/422 CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED. Za to je potreban
// test OIDC izdavalac (statičan servis sa discovery + jwks.json) dostupan iz
// auth-service kontejnera.

import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser } from '../fixtures/api';
import {
  ID_TOKEN_TYPE,
  assertStatus,
  createBusinessWithLocation,
  exchangeToken,
  fetchDetail,
  fetchOwnerConsents,
  fetchUserId,
  integrationBody,
  registerPartner,
  saveIntegration,
  signIdTokenWithUnknownKey,
  type ClientApplicationDto,
  type ClientApplicationDetailDto,
  type IntegrationBody,
} from '../fixtures/partners';

interface WidgetConfig {
  clientApplicationId: string;
  enabled: boolean;
  locations: { locationId: string; businessId: string }[];
}

test.describe('epic:67 admin: lista, detalj i integraciona konfiguracija partnera', () => {
  test('API: lista, detalj sa PENDING saglasnostima i izmena integracije', async () => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    const ownerApi = await ApiClient.as(owner);
    try {
      const ownerId = await fetchUserId(adminApi, owner.email);
      const first = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner A');
      const second = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner B');
      const partner = await registerPartner(adminApi, [first.location.id, second.location.id]);
      expect(partner.scope).toEqual({
        type: 'LOCATION_LIST',
        locationIds: expect.arrayContaining([first.location.id, second.location.id]),
      });

      const list = await adminApi.get('/admin/client-applications');
      await assertStatus(list, 200, 'GET /admin/client-applications');
      const apps = (await list.json()) as ClientApplicationDto[];
      expect(apps.map((a) => a.id)).toContain(partner.id);

      const detail = await fetchDetail(adminApi, partner.id);
      expect(detail.name).toBe(partner.name);
      expect(detail.consents.map((c) => c.locationId).sort()).toEqual(
        [first.location.id, second.location.id].sort(),
      );
      expect(detail.consents.every((c) => c.status === 'PENDING')).toBe(true);

      const emptyIntegration = await adminApi.auth.get(`admin/client-applications/${partner.id}/integration`);
      await assertStatus(emptyIntegration, 200, 'GET integration (prazna)');

      const body = integrationBody();
      await saveIntegration(adminApi, partner.id, body);
      const saved = await adminApi.auth.get(`admin/client-applications/${partner.id}/integration`);
      await assertStatus(saved, 200, 'GET integration');
      expect(await saved.json()).toEqual({ clientApplicationId: partner.id, ...body });

      const invalidOrigin = await adminApi.auth.put(`admin/client-applications/${partner.id}/integration`, {
        data: integrationBody({ allowedOrigins: ['https://partner.e2e.reserva.test/putanja/'] }),
      });
      await assertStatus(invalidOrigin, 422, 'PUT integration (neispravan origin)');
    } finally {
      await ownerApi.dispose();
      await adminApi.dispose();
    }
  });

  test('API: obični korisnik i anonimni ne vide admin endpoint-e partnera', async ({ anonymousApi }) => {
    const adminApi = await ApiClient.as(adminCredentials());
    const user = await createActivatedUser();
    const userApi = await ApiClient.as(user);
    try {
      const ownerId = await fetchUserId(adminApi, user.email);
      const { location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner authz');
      const partner = await registerPartner(adminApi, [location.id]);

      await assertStatus(await anonymousApi.get('/admin/client-applications'), 401, 'lista bez tokena');
      await assertStatus(await userApi.get('/admin/client-applications'), 403, 'lista, običan korisnik');
      await assertStatus(await userApi.get(`/admin/client-applications/${partner.id}`), 403, 'detalj, običan korisnik');
      await assertStatus(
        await userApi.auth.put(`admin/client-applications/${partner.id}/integration`, { data: integrationBody() }),
        403,
        'PUT integration, običan korisnik',
      );
    } finally {
      await userApi.dispose();
      await adminApi.dispose();
    }
  });

  test('UI: admin otvara detalj partnera i čuva integracionu konfiguraciju', async ({ page, loginAs }) => {
    const admin = adminCredentials();
    const adminApi = await ApiClient.as(admin);
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchUserId(adminApi, owner.email);
      const { location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner UI admin');
      const partner = await registerPartner(adminApi, [location.id]);

      await loginAs(admin);
      await page.goto(`/dashboard/client-applications/${partner.id}`);
      await expect(page.getByRole('heading', { level: 1, name: partner.name })).toBeVisible();
      await expect(page.getByRole('row', { name: /Pending/ })).toHaveCount(1);

      await page.getByRole('button', { name: 'Add issuer' }).click();
      await page.getByLabel('Issuer 1 URL').fill('https://issuer.e2e.reserva.test');
      await page.getByLabel('Issuer 1 JWKS URI').fill('https://issuer.e2e.reserva.test/jwks.json');
      await page.getByLabel('Issuer 1 audiences').fill('e2e-partner-audience');
      await page.getByLabel('Allowed origins (one per line)').fill('https://partner.e2e.reserva.test');
      await page.getByRole('checkbox', { name: 'Create reservations' }).check();
      await page.getByRole('button', { name: 'Save integration' }).click();

      await expect(page.getByRole('status')).toContainText('Integration configuration saved');

      const saved = await adminApi.auth.get(`admin/client-applications/${partner.id}/integration`);
      await assertStatus(saved, 200, 'GET integration');
      const body = (await saved.json()) as IntegrationBody;
      expect(body.trustedIssuers).toEqual([
        {
          type: 'OIDC',
          issuer: 'https://issuer.e2e.reserva.test',
          jwksUri: 'https://issuer.e2e.reserva.test/jwks.json',
          audiences: ['e2e-partner-audience'],
        },
      ]);
      expect(body.allowedOrigins).toEqual(['https://partner.e2e.reserva.test']);
      expect(body.allowedScopes).toContain('reservation:create');
    } finally {
      await adminApi.dispose();
    }
  });
});

test.describe('epic:67 vlasnik biznisa: saglasnosti na stranici „Partneri“', () => {
  test('UI: vlasnik vidi partnera, odobrava pa opoziva; widget-config prati saglasnost', async ({
    page,
    loginAs,
    anonymousApi,
  }) => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchUserId(adminApi, owner.email);
      const { business, location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner owner');
      const partner = await registerPartner(adminApi, [location.id]);
      await saveIntegration(adminApi, partner.id);

      const widgetConfig = async (): Promise<WidgetConfig> => {
        const response = await anonymousApi.get(`/client-applications/${partner.id}/widget-config`);
        await assertStatus(response, 200, 'GET widget-config');
        return (await response.json()) as WidgetConfig;
      };
      expect((await widgetConfig()).locations).toEqual([]);

      await loginAs(owner);
      await page.goto('/dashboard/partners');
      await expect(page.getByRole('heading', { level: 1, name: 'Partners' })).toBeVisible();

      const card = page.getByTestId('partner-consent-card').filter({ hasText: partner.name });
      await expect(card).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'Awaiting your decision' })).toBeVisible();
      // Pre odobravanja je jasno ko je partner i šta sme.
      await expect(card).toContainText('https://partner.e2e.reserva.test');
      await expect(card).toContainText('Create reservations');

      await card.getByRole('button', { name: 'Approve' }).click();
      await expect(page.getByRole('heading', { level: 3, name: 'Approved' })).toBeVisible();
      await expect(card.getByRole('button', { name: 'Revoke' })).toBeVisible();
      await expect
        .poll(async () => (await widgetConfig()).locations.map((l) => l.locationId))
        .toEqual([location.id]);
      expect((await widgetConfig()).locations[0]?.businessId).toBe(business.id);

      await card.getByRole('button', { name: 'Revoke' }).click();
      await expect(page.getByRole('heading', { level: 3, name: 'Revoked' })).toBeVisible();
      await expect(card.getByRole('button', { name: 'Approve' })).toBeVisible();
      await expect.poll(async () => (await widgetConfig()).locations).toEqual([]);

      const detail = await fetchDetail(adminApi, partner.id);
      expect(detail.consents.map((c) => c.status)).toEqual(['REVOKED']);
    } finally {
      await adminApi.dispose();
    }
  });

  test('API: vlasnik vidi i menja samo saglasnosti za svoje lokacije (tuđa je 404)', async () => {
    const adminApi = await ApiClient.as(adminCredentials());
    const ownerA = await createActivatedUser();
    const ownerB = await createActivatedUser();
    const apiA = await ApiClient.as(ownerA);
    const apiB = await ApiClient.as(ownerB);
    try {
      const idA = await fetchUserId(adminApi, ownerA.email);
      const idB = await fetchUserId(adminApi, ownerB.email);
      const bizA = await createBusinessWithLocation(adminApi, idA, 'E2E Partner vlasnik A');
      const bizB = await createBusinessWithLocation(adminApi, idB, 'E2E Partner vlasnik B');
      const partner = await registerPartner(adminApi, [bizA.location.id, bizB.location.id]);

      const consentsA = (await fetchOwnerConsents(apiA)).filter((c) => c.clientApplication.id === partner.id);
      const consentsB = (await fetchOwnerConsents(apiB)).filter((c) => c.clientApplication.id === partner.id);
      expect(consentsA.map((c) => c.location.id)).toEqual([bizA.location.id]);
      expect(consentsB.map((c) => c.location.id)).toEqual([bizB.location.id]);
      const [mineA] = consentsA;
      const [mineB] = consentsB;
      if (!mineA || !mineB) throw new Error('očekivana po jedna saglasnost za svakog vlasnika');

      // Vlasnik B ne sme da odobri ni opozove saglasnost vlasnika A.
      await assertStatus(await apiB.post(`/client-application-consents/${mineA.id}/approve`), 404, 'tuđe odobravanje');
      await assertStatus(await apiB.post(`/client-application-consents/${mineA.id}/revoke`), 404, 'tuđi opoziv');
      const stillPending = (await fetchDetail(adminApi, partner.id)).consents.find((c) => c.id === mineA.id);
      expect(stillPending?.status).toBe('PENDING');

      await assertStatus(await apiA.post(`/client-application-consents/${mineA.id}/approve`), 200, 'svoje odobravanje');
      const afterApprove: ClientApplicationDetailDto = await fetchDetail(adminApi, partner.id);
      expect(afterApprove.consents.find((c) => c.id === mineA.id)?.status).toBe('APPROVED');
      expect(afterApprove.consents.find((c) => c.id === mineB.id)?.status).toBe('PENDING');
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await adminApi.dispose();
    }
  });
});

test.describe('epic:67 javni endpoint-i partnera i token exchange (odbijanja)', () => {
  test('widget-config i javna integracija ne otkrivaju tajne ni izdavaoce', async ({ anonymousApi }) => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchUserId(adminApi, owner.email);
      const { location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner public');
      const partner = await registerPartner(adminApi, [location.id]);
      await saveIntegration(adminApi, partner.id);

      const config = await anonymousApi.get(`/client-applications/${partner.id}/widget-config`);
      await assertStatus(config, 200, 'GET widget-config');
      const configText = await config.text();
      expect(JSON.parse(configText)).toMatchObject({ clientApplicationId: partner.id, enabled: true, locations: [] });
      expect(configText).not.toMatch(/secret|jwks|issuer|audience/i);

      const integration = await anonymousApi.auth.get(`client-applications/${partner.id}/integration`);
      await assertStatus(integration, 200, 'GET javna integracija');
      const publicBody = (await integration.json()) as Record<string, unknown>;
      expect(publicBody).toEqual({
        clientApplicationId: partner.id,
        allowedOrigins: ['https://partner.e2e.reserva.test'],
        allowedScopes: ['reservation:create', 'reservation:read:own'],
      });

      await assertStatus(
        await anonymousApi.get(`/client-applications/${crypto.randomUUID()}/widget-config`),
        404,
        'widget-config nepostojećeg partnera',
      );
    } finally {
      await adminApi.dispose();
    }
  });

  test('token exchange odbija zahteve bez zamene tokena', async () => {
    const adminApi = await ApiClient.as(adminCredentials());
    const owner = await createActivatedUser();
    try {
      const ownerId = await fetchUserId(adminApi, owner.email);
      const { location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner exchange');
      const partner = await registerPartner(adminApi, [location.id]);
      const unconfigured = await exchangeToken({
        client_id: partner.id,
        subject_token_type: ID_TOKEN_TYPE,
        subject_token: signIdTokenWithUnknownKey({ iss: 'https://issuer.e2e.reserva.test', aud: 'x' }),
      });
      // Partner bez integracione konfiguracije: nije validan javni klijent.
      expect(unconfigured.status).toBe(401);
      expect(unconfigured.body.error).toBe('invalid_client');

      await saveIntegration(adminApi, partner.id);

      // client_id koji nije partner.
      const notPartner = await exchangeToken({
        client_id: crypto.randomUUID(),
        subject_token_type: ID_TOKEN_TYPE,
        subject_token: signIdTokenWithUnknownKey({ iss: 'https://issuer.e2e.reserva.test', aud: 'e2e-partner-audience' }),
      });
      expect(notPartner.status).toBe(401);
      expect(notPartner.body.error).toBe('invalid_client');

      // Nedostaje subject_token.
      const missing = await exchangeToken({ client_id: partner.id, subject_token_type: ID_TOKEN_TYPE });
      expect(missing.status).toBe(400);
      expect(missing.body.error).toBe('invalid_request');

      // Pogrešan subject_token_type.
      const wrongType = await exchangeToken({
        client_id: partner.id,
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        subject_token: signIdTokenWithUnknownKey({ iss: 'https://issuer.e2e.reserva.test', aud: 'e2e-partner-audience' }),
      });
      expect(wrongType.status).toBe(400);
      expect(wrongType.body.error).toBe('invalid_request');

      // Nepoznat izdavalac (i potpis ključem koji niko ne poznaje).
      const unknownIssuer = await exchangeToken({
        client_id: partner.id,
        subject_token_type: ID_TOKEN_TYPE,
        subject_token: signIdTokenWithUnknownKey({ iss: 'https://nepoznat.e2e.reserva.test', aud: 'e2e-partner-audience' }),
      });
      expect(unknownIssuer.status).toBe(400);
      expect(unknownIssuer.body.error).toBe('invalid_grant');
      expect(unknownIssuer.body.access_token).toBeUndefined();
    } finally {
      await adminApi.dispose();
    }
  });
});
