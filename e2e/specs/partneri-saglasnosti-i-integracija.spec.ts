// epic:67 · Faza 2 / A: partneri sa sopstvenim loginom
//
// Pokriveno: admin lista/detalj/izmena integracije (API + UI), saglasnosti po
// lokaciji (vlasnik odobrava/opoziva, izolacija vlasnika), javni widget-config i
// integration endpoint-i bez tajni, i odbijanje token exchange-a koje ne traži
// spoljnog izdavaoca.
//
// Tiket #330 dodaje (nad test OIDC izdavaocem `oidc-issuer` iz compose.e2e.yml):
// uspešnu zamenu ID tokena + claim-ove/scope presek, odbijanja (aud, izdavalac
// drugog partnera, istekao token, loš potpis), vezivanje po (issuer, subject),
// vlasništvo rezervacije (404 za tuđu) i rezervaciju sa APPROVED / 422 posle opoziva.
//
// Tiket #341 (epic 71) dodaje isključivanje/ponovno uključivanje partnera
// (PATCH /admin/client-applications/{id}, API + UI prekidač sa potvrdom).
//
// NIJE pokriveno: vezivanje po Google `sub` (traži
// postojeći nalog povezan sa Google-om, a Google se ne može simulirati).

import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueEmail } from '../fixtures/api';
import {
  ID_TOKEN_TYPE,
  OIDC_JWKS_URI,
  approveConsent,
  assertStatus,
  createBookableLocation,
  createBusinessWithLocation,
  decodeJwtClaims,
  exchangeIdToken,
  exchangeToken,
  fetchDetail,
  fetchOwnerConsents,
  fetchUserId,
  integrationBody,
  oidcIntegrationBody,
  partnerApi,
  partnerReservationBody,
  registerPartner,
  revokeConsent,
  saveIntegration,
  signIdTokenWithUnknownKey,
  signOidcIdToken,
  uniqueAudience,
  uniqueSubject,
  type BookableLocation,
  type PartnerReservationDto,
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
          inlineJwk: null,
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

// ---------------------------------------------------------------------------
// Uspešan token exchange nad test OIDC izdavaocem (`oidc-issuer`, compose.e2e.yml)
// ---------------------------------------------------------------------------

interface PartnerSetup {
  adminApi: ApiClient;
  ownerApi: ApiClient;
  partner: ClientApplicationDto;
  audience: string;
  bookable: BookableLocation;
}

/** Biznis + rezervabilan resurs + partner sa integracijom koja veruje test izdavaocu (bez saglasnosti). */
async function setUpPartner(namePrefix: string): Promise<PartnerSetup> {
  const adminApi = await ApiClient.as(adminCredentials());
  const owner = await createActivatedUser();
  const ownerApi = await ApiClient.as(owner);
  const ownerId = await fetchUserId(adminApi, owner.email);
  const bookable = await createBookableLocation(adminApi, ownerId);
  const partner = await registerPartner(adminApi, [bookable.location.id], namePrefix);
  const audience = uniqueAudience();
  await saveIntegration(adminApi, partner.id, oidcIntegrationBody(audience));
  return { adminApi, ownerApi, partner, audience, bookable };
}

async function tearDown(setup: PartnerSetup): Promise<void> {
  await setup.ownerApi.dispose();
  await setup.adminApi.dispose();
}

test.describe('epic:67 token exchange: uspešna zamena i odbijanja (test OIDC izdavalac)', () => {
  test('uspešna zamena ID tokena: 10 min, bez refresh tokena, scope je presek, claim-ovi partnerskog tokena', async () => {
    const setup = await setUpPartner('E2E Partner exchange ok');
    try {
      const { partner, audience } = setup;
      const email = uniqueEmail('guest');
      const subject = uniqueSubject();

      // Bez `scope`: svi dozvoljeni scope-ovi partnera.
      const all = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, sub: subject, email }));
      expect(all.status, JSON.stringify(all.body)).toBe(200);
      expect(all.body.token_type).toBe('Bearer');
      expect(all.body.issued_token_type).toBe('urn:ietf:params:oauth:token-type:access_token');
      expect(all.body.refresh_token).toBeUndefined();
      expect(all.body.expires_in).toBeGreaterThan(540);
      expect(all.body.expires_in).toBeLessThanOrEqual(600);
      expect((all.body.scope ?? '').split(' ').sort()).toEqual(['reservation:create', 'reservation:read:own']);

      const claims = decodeJwtClaims(all.body.access_token ?? '');
      expect(claims['clientApplicationId']).toBe(partner.id);
      expect(claims['externalIdentityId']).toEqual(expect.any(String));
      expect(claims['sub']).toBe(claims['externalIdentityId']);
      expect(claims['guestEmail']).toBe(email);
      expect(claims['guestEmailVerified']).toBe(true);
      expect(claims['linkedUserId'] ?? null).toBeNull();
      expect((claims['scope'] as string[]).slice().sort()).toEqual(['reservation:create', 'reservation:read:own']);
      const lifetime = (claims['exp'] as number) - (claims['iat'] as number);
      expect(lifetime).toBeGreaterThan(540);
      expect(lifetime).toBeLessThanOrEqual(600);

      // Sa `scope`: presek traženog i dozvoljenog (nepoznat scope otpada).
      const intersection = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, sub: subject, email }), {
        scope: 'reservation:create reservation:delete',
      });
      expect(intersection.status, JSON.stringify(intersection.body)).toBe(200);
      expect(intersection.body.scope).toBe('reservation:create');

      // Nijedan traženi scope nije dozvoljen.
      const none = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience }), { scope: 'reservation:delete' });
      expect(none.status).toBe(400);
      expect(none.body.error).toBe('invalid_scope');
      expect(none.body.access_token).toBeUndefined();
    } finally {
      await tearDown(setup);
    }
  });

  test('odbija pogrešan aud, izdavaoca drugog partnera, istekao token i loš potpis', async () => {
    const setup = await setUpPartner('E2E Partner exchange odbijanja');
    try {
      const { partner, audience, adminApi, bookable } = setup;

      const wrongAudience = await exchangeIdToken(partner.id, signOidcIdToken({ aud: 'neki-drugi-audience' }));
      expect(wrongAudience.status).toBe(400);
      expect(wrongAudience.body.error).toBe('invalid_grant');
      expect(wrongAudience.body.access_token).toBeUndefined();

      // Drugi partner veruje drugom izdavaocu; token test izdavaoca nije za njega.
      const otherPartner = await registerPartner(adminApi, [bookable.location.id], 'E2E Partner drugi izdavalac');
      const otherAudience = uniqueAudience();
      await saveIntegration(
        adminApi,
        otherPartner.id,
        oidcIntegrationBody(otherAudience, {
          trustedIssuers: [
            {
              type: 'OIDC',
              issuer: 'https://drugi-izdavalac.e2e.reserva.test',
              jwksUri: OIDC_JWKS_URI,
              audiences: [otherAudience],
            },
          ],
        }),
      );
      const foreignIssuer = await exchangeIdToken(otherPartner.id, signOidcIdToken({ aud: otherAudience }));
      expect(foreignIssuer.status).toBe(400);
      expect(foreignIssuer.body.error).toBe('invalid_grant');
      expect(foreignIssuer.body.access_token).toBeUndefined();

      const expired = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, expiresInSeconds: -3600 }));
      expect(expired.status).toBe(400);
      expect(expired.body.error).toBe('invalid_grant');
      expect(expired.body.access_token).toBeUndefined();

      const badSignature = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, badSignature: true }));
      expect(badSignature.status).toBe(400);
      expect(badSignature.body.error).toBe('invalid_grant');
      expect(badSignature.body.access_token).toBeUndefined();

      // Kontrola: ispravan token istog partnera prolazi.
      const valid = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience }));
      expect(valid.status, JSON.stringify(valid.body)).toBe(200);
    } finally {
      await tearDown(setup);
    }
  });

  test('identitet se vezuje po (issuer, subject): isti subject daje isti identitet, drugi subject drugi', async () => {
    const setup = await setUpPartner('E2E Partner vezivanje');
    try {
      const { partner, audience } = setup;
      const subject = uniqueSubject();
      const identityOf = async (sub: string, email: string): Promise<unknown> => {
        const result = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, sub, email }));
        expect(result.status, JSON.stringify(result.body)).toBe(200);
        return decodeJwtClaims(result.body.access_token ?? '')['externalIdentityId'];
      };

      const first = await identityOf(subject, uniqueEmail('prvi'));
      const again = await identityOf(subject, uniqueEmail('drugi'));
      const other = await identityOf(uniqueSubject(), uniqueEmail('treci'));
      expect(again).toBe(first);
      expect(other).not.toBe(first);
    } finally {
      await tearDown(setup);
    }
  });
});

test.describe('epic:67 rezervacija partnerskim tokenom', () => {
  test('rezervacija sa APPROVED saglasnošću prolazi; pre odobravanja i posle opoziva je 422', async () => {
    const setup = await setUpPartner('E2E Partner rezervacija');
    try {
      const { partner, audience, ownerApi, bookable } = setup;
      const exchange = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience }));
      expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
      const api = await partnerApi(exchange.body.access_token ?? '');
      try {
        const body = partnerReservationBody(bookable);
        const consentCode = 'CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED';

        // Pre odobravanja (PENDING).
        const pending = await api.post('/client-applications/reservations', body);
        expect(pending.status()).toBe(422);
        expect(((await pending.json()) as { code?: string }).code).toBe(consentCode);

        const consent = await approveConsent(ownerApi, partner.id);
        const created = await api.post('/client-applications/reservations', body);
        expect([200, 201], await created.text()).toContain(created.status());
        const reservation = (await created.json()) as PartnerReservationDto;
        expect(reservation.resourceId).toBe(bookable.resourceId);
        expect(reservation.startTime).toBe(bookable.startTime);

        // Opoziv odmah blokira nove rezervacije (drugi termin, da ne bude 409).
        await revokeConsent(ownerApi, consent.id);
        const afterRevoke = await api.post('/client-applications/reservations', {
          ...body,
          startTime: bookable.startTime.replace('T08:00', 'T09:00'),
          endTime: bookable.endTime.replace('T08:30', 'T09:30'),
        });
        expect(afterRevoke.status()).toBe(422);
        expect(((await afterRevoke.json()) as { code?: string }).code).toBe(consentCode);
      } finally {
        await api.dispose();
      }
    } finally {
      await tearDown(setup);
    }
  });

  test('rezervacija se vezuje za external identity: svoju vidi isti identitet, tuđa je 404; token ne važi na Reserva endpoint-ima', async () => {
    const setup = await setUpPartner('E2E Partner identitet rezervacije');
    try {
      const { partner, audience, ownerApi, bookable } = setup;
      await approveConsent(ownerApi, partner.id);
      const subject = uniqueSubject();

      const tokenFor = async (sub: string): Promise<string> => {
        const exchange = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, sub }));
        expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
        return exchange.body.access_token ?? '';
      };
      const apiA = await partnerApi(await tokenFor(subject));
      const apiA2 = await partnerApi(await tokenFor(subject)); // nova zamena, isti identitet
      const apiB = await partnerApi(await tokenFor(uniqueSubject()));
      try {
        const created = await apiA.post('/client-applications/reservations', partnerReservationBody(bookable));
        expect([200, 201], await created.text()).toContain(created.status());
        const reservation = (await created.json()) as PartnerReservationDto;

        const own = await apiA2.get(`/client-applications/reservations/${reservation.id}`);
        expect(own.status()).toBe(200);
        expect(((await own.json()) as PartnerReservationDto).id).toBe(reservation.id);
        const ownList = (await (await apiA2.get('/client-applications/reservations')).json()) as PartnerReservationDto[];
        expect(ownList.map((r) => r.id)).toEqual([reservation.id]);

        // Tuđa i nepostojeća rezervacija daju isti 404; tuđa se ne pojavljuje u listi.
        expect((await apiB.get(`/client-applications/reservations/${reservation.id}`)).status()).toBe(404);
        expect((await apiB.get(`/client-applications/reservations/${crypto.randomUUID()}`)).status()).toBe(404);
        const foreignList = (await (await apiB.get('/client-applications/reservations')).json()) as PartnerReservationDto[];
        expect(foreignList).toEqual([]);

        // Partnerski token ne važi na Reserva korisničkim endpoint-ima.
        expect((await apiA.get('/reservations')).status()).toBe(403);
      } finally {
        await apiA.dispose();
        await apiA2.dispose();
        await apiB.dispose();
      }
    } finally {
      await tearDown(setup);
    }
  });
});

test.describe('epic:71 admin isključuje i ponovo uključuje partnera', () => {
  test('API: isključen partner dobija invalid_client, postojeći token ne rezerviše, ponovo uključen radi; obični korisnik 403', async ({
    anonymousApi,
  }) => {
    const setup = await setUpPartner('E2E Partner isključivanje');
    try {
      const { partner, audience, adminApi, ownerApi, bookable } = setup;
      expect(partner.enabled).toBe(true);
      const consent = await approveConsent(ownerApi, partner.id);

      const subject = uniqueSubject();
      const before = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, sub: subject }));
      expect(before.status, JSON.stringify(before.body)).toBe(200);
      const api = await partnerApi(before.body.access_token ?? '');
      try {
        const body = partnerReservationBody(bookable);
        const created = await api.post('/client-applications/reservations', body);
        expect([200, 201], await created.text()).toContain(created.status());
        const reservation = (await created.json()) as PartnerReservationDto;

        // Obični korisnik i anonimni ne smeju da menjaju `enabled`; loš zahtev i nepoznat partner.
        await assertStatus(
          await ownerApi.patch(`/admin/client-applications/${partner.id}`, { data: { enabled: false } }),
          403,
          'PATCH enabled, običan korisnik',
        );
        await assertStatus(
          await anonymousApi.patch(`/admin/client-applications/${partner.id}`, { data: { enabled: false } }),
          401,
          'PATCH enabled, bez tokena',
        );
        await assertStatus(
          await adminApi.patch(`/admin/client-applications/${partner.id}`, { data: {} }),
          400,
          'PATCH bez enabled',
        );
        await assertStatus(
          await adminApi.patch(`/admin/client-applications/${crypto.randomUUID()}`, { data: { enabled: false } }),
          404,
          'PATCH nepostojeći partner',
        );
        expect((await fetchDetail(adminApi, partner.id)).enabled).toBe(true);

        const disabled = await adminApi.patch(`/admin/client-applications/${partner.id}`, { data: { enabled: false } });
        await assertStatus(disabled, 200, 'PATCH enabled=false');
        expect(((await disabled.json()) as ClientApplicationDto).enabled).toBe(false);

        // Novi token exchange: invalid_client.
        const rejected = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience }));
        expect(rejected.status).toBe(401);
        expect(rejected.body.error).toBe('invalid_client');
        expect(rejected.body.access_token).toBeUndefined();

        // Postojeći (još važeći) token više ne pravi rezervaciju (drugi termin, da ne bude 409).
        const blocked = await api.post('/client-applications/reservations', {
          ...body,
          startTime: bookable.startTime.replace('T08:00', 'T09:00'),
          endTime: bookable.endTime.replace('T08:30', 'T09:30'),
        });
        expect(blocked.status(), await blocked.text()).toBeGreaterThanOrEqual(400);
        expect(blocked.status()).toBeLessThan(500);

        // Saglasnost ostaje netaknuta.
        const detail = await fetchDetail(adminApi, partner.id);
        expect(detail.enabled).toBe(false);
        expect(detail.consents.find((c) => c.id === consent.id)?.status).toBe('APPROVED');

        const enabled = await adminApi.patch(`/admin/client-applications/${partner.id}`, { data: { enabled: true } });
        await assertStatus(enabled, 200, 'PATCH enabled=true');
        expect(((await enabled.json()) as ClientApplicationDto).enabled).toBe(true);

        // Ponovo uključen: nova zamena radi, a isti identitet i dalje vidi ranije napravljenu rezervaciju.
        const after = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience, sub: subject }));
        expect(after.status, JSON.stringify(after.body)).toBe(200);
        const apiAfter = await partnerApi(after.body.access_token ?? '');
        try {
          expect((await apiAfter.get(`/client-applications/reservations/${reservation.id}`)).status()).toBe(200);
        } finally {
          await apiAfter.dispose();
        }
      } finally {
        await api.dispose();
      }
    } finally {
      await tearDown(setup);
    }
  });

  test('UI: admin isključuje i ponovo uključuje partnera preko prekidača sa potvrdom', async ({ page, loginAs }) => {
    const setup = await setUpPartner('E2E Partner prekidač');
    try {
      const { partner, audience, adminApi } = setup;
      await loginAs(adminCredentials());
      await page.goto(`/dashboard/client-applications/${partner.id}`);
      await expect(page.getByRole('heading', { level: 1, name: partner.name })).toBeVisible();

      const toggle = page.getByRole('switch', { name: `Partner ${partner.name} enabled` });
      await expect(toggle).toBeChecked();

      // Odustajanje ne menja ništa.
      await toggle.click();
      const disableDialog = page.getByRole('dialog', { name: `Disable ${partner.name}?` });
      await expect(disableDialog).toBeVisible();
      await disableDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(disableDialog).toBeHidden();
      await expect(toggle).toBeChecked();
      expect((await fetchDetail(adminApi, partner.id)).enabled).toBe(true);

      await toggle.click();
      await disableDialog.getByRole('button', { name: 'Disable partner' }).click();
      await expect(disableDialog).toBeHidden();
      await expect(toggle).not.toBeChecked();
      await expect.poll(async () => (await fetchDetail(adminApi, partner.id)).enabled).toBe(false);
      const rejected = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience }));
      expect(rejected.status).toBe(401);
      expect(rejected.body.error).toBe('invalid_client');

      const enableDialog = page.getByRole('dialog', { name: `Enable ${partner.name}?` });
      await toggle.click();
      await enableDialog.getByRole('button', { name: 'Enable partner' }).click();
      await expect(enableDialog).toBeHidden();
      await expect(toggle).toBeChecked();
      await expect.poll(async () => (await fetchDetail(adminApi, partner.id)).enabled).toBe(true);
      const ok = await exchangeIdToken(partner.id, signOidcIdToken({ aud: audience }));
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    } finally {
      await tearDown(setup);
    }
  });
});
