// epic:92 · Partner otkazuje rezervaciju svog korisnika (scope reservation:cancel:own)
//
// Pokriveno: uspešno otkazivanje vlasnika, 404 (tuđ korisnik, tuđa aplikacija, nepostojeća),
// 403 bez scope-a, 422 za status koji politika ne dozvoljava (već otkazana), presek scope-ova
// pri token exchange-u (allowed_scopes) i prisustvo endpointa u javnom spec-u.
//
// NIJE pokriveno: dugme za otkazivanje u widget-u (van opsega epica) i unit-nivo testovi BE.

import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser } from '../fixtures/api';
import {
  approveConsent,
  assertStatus,
  createBookableLocation,
  decodeJwtClaims,
  exchangeAssertion,
  fetchUserId,
  generatePartnerKey,
  integrationBody,
  partnerApi,
  partnerKeyIntegrationBody,
  partnerReservationBody,
  registerPartner,
  saveIntegration,
  signPartnerAssertion,
  uniquePartnerIssuer,
  uniqueSubject,
  type BookableLocation,
  type ClientApplicationDto,
  type PartnerApi,
  type PartnerKeyPair,
  type PartnerReservationDto,
} from '../fixtures/partners';

const CANCEL_SCOPE = 'reservation:cancel:own';
const ALL_SCOPES = ['reservation:create', 'reservation:read:own', CANCEL_SCOPE];

interface Setup {
  adminApi: ApiClient;
  ownerApi: ApiClient;
  partner: ClientApplicationDto;
  bookable: BookableLocation;
  issuer: string;
  key: PartnerKeyPair;
}

async function setUp(allowedScopes: string[]): Promise<Setup> {
  const adminApi = await ApiClient.as(adminCredentials());
  const owner = await createActivatedUser();
  const ownerApi = await ApiClient.as(owner);
  const ownerId = await fetchUserId(adminApi, owner.email);
  const bookable = await createBookableLocation(adminApi, ownerId);
  const partner = await registerPartner(adminApi, [bookable.location.id], 'E2E Partner cancel');
  const issuer = uniquePartnerIssuer();
  const key = generatePartnerKey();
  await saveIntegration(adminApi, partner.id, {
    ...partnerKeyIntegrationBody(issuer, key),
    allowedScopes,
  });
  await approveConsent(ownerApi, partner.id);
  return { adminApi, ownerApi, partner, bookable, issuer, key };
}

async function tearDown(setup: Setup): Promise<void> {
  await setup.ownerApi.dispose();
  await setup.adminApi.dispose();
}

async function partnerTokenFor(setup: Setup, subject: string, extra: Record<string, string> = {}): Promise<string> {
  const exchange = await exchangeAssertion(
    setup.partner.id,
    signPartnerAssertion({ key: setup.key, iss: setup.issuer, sub: subject }),
    extra,
  );
  expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
  return exchange.body.access_token ?? '';
}

async function createReservation(api: PartnerApi, bookable: BookableLocation): Promise<PartnerReservationDto> {
  const created = await api.post('/client-applications/reservations', partnerReservationBody(bookable));
  await assertStatus(created, 200, 'POST /client-applications/reservations');
  return (await created.json()) as PartnerReservationDto;
}

const cancelPath = (id: string) => `/client-applications/reservations/${id}/cancel`;

function scopesOf(token: string): string[] {
  return decodeJwtClaims(token)['scope'] as string[];
}

test.describe('epic:92 partner otkazuje rezervaciju', () => {
  test('vlasnik otkazuje svoju rezervaciju; odgovor je isti kao GET; drugo otkazivanje daje 422', async () => {
    const setup = await setUp(ALL_SCOPES);
    const api = await partnerApi(await partnerTokenFor(setup, uniqueSubject()));
    try {
      const reservation = await createReservation(api, setup.bookable);
      expect(reservation.status).not.toBe('CANCELLED');

      const cancelled = await api.post(cancelPath(reservation.id));
      await assertStatus(cancelled, 200, 'POST cancel');
      const cancelledBody = (await cancelled.json()) as PartnerReservationDto;
      expect(cancelledBody.id).toBe(reservation.id);
      expect(cancelledBody.status).toBe('CANCELLED');

      const read = await api.get(`/client-applications/reservations/${reservation.id}`);
      await assertStatus(read, 200, 'GET reservation');
      expect(await read.json()).toEqual(cancelledBody);

      // Status CANCELLED politika ne dozvoljava za otkazivanje.
      await assertStatus(await api.post(cancelPath(reservation.id)), 422, 'POST cancel (već otkazana)');
    } finally {
      await api.dispose();
      await tearDown(setup);
    }
  });

  test('tuđa i nepostojeća rezervacija daju 404, a vlasnikova rezervacija ostaje neotkazana', async () => {
    const setup = await setUp(ALL_SCOPES);
    const ownerSubject = uniqueSubject();
    const ownerPartnerApi = await partnerApi(await partnerTokenFor(setup, ownerSubject));
    const otherUserApi = await partnerApi(await partnerTokenFor(setup, uniqueSubject()));

    // Druga klijentska aplikacija sa istom lokacijom i odobrenom saglasnošću.
    const otherPartner = await registerPartner(setup.adminApi, [setup.bookable.location.id], 'E2E Partner cancel drugi');
    const otherIssuer = uniquePartnerIssuer();
    const otherKey = generatePartnerKey();
    await saveIntegration(setup.adminApi, otherPartner.id, {
      ...partnerKeyIntegrationBody(otherIssuer, otherKey),
      allowedScopes: ALL_SCOPES,
    });
    await approveConsent(setup.ownerApi, otherPartner.id);
    const otherExchange = await exchangeAssertion(
      otherPartner.id,
      signPartnerAssertion({ key: otherKey, iss: otherIssuer, sub: ownerSubject }),
    );
    expect(otherExchange.status, JSON.stringify(otherExchange.body)).toBe(200);
    const otherPartnerApi = await partnerApi(otherExchange.body.access_token ?? '');

    try {
      const reservation = await createReservation(ownerPartnerApi, setup.bookable);

      await assertStatus(await otherUserApi.post(cancelPath(reservation.id)), 404, 'cancel: tuđ korisnik');
      await assertStatus(await otherPartnerApi.post(cancelPath(reservation.id)), 404, 'cancel: tuđa aplikacija');
      await assertStatus(
        await ownerPartnerApi.post(cancelPath('00000000-0000-4000-8000-000000000000')),
        404,
        'cancel: nepostojeća',
      );

      const read = await ownerPartnerApi.get(`/client-applications/reservations/${reservation.id}`);
      await assertStatus(read, 200, 'GET reservation');
      expect(((await read.json()) as PartnerReservationDto).status).not.toBe('CANCELLED');
    } finally {
      await otherPartnerApi.dispose();
      await otherUserApi.dispose();
      await ownerPartnerApi.dispose();
      await tearDown(setup);
    }
  });

  test('token bez scope-a reservation:cancel:own dobija 403 i rezervacija ostaje', async () => {
    const setup = await setUp(ALL_SCOPES);
    const noCancelToken = await partnerTokenFor(setup, uniqueSubject(), {
      scope: 'reservation:create reservation:read:own',
    });
    expect(scopesOf(noCancelToken)).not.toContain(CANCEL_SCOPE);
    const api = await partnerApi(noCancelToken);
    try {
      const reservation = await createReservation(api, setup.bookable);
      await assertStatus(await api.post(cancelPath(reservation.id)), 403, 'cancel bez scope-a');

      const read = await api.get(`/client-applications/reservations/${reservation.id}`);
      await assertStatus(read, 200, 'GET reservation');
      expect(((await read.json()) as PartnerReservationDto).status).not.toBe('CANCELLED');
    } finally {
      await api.dispose();
      await tearDown(setup);
    }
  });

  test('token exchange dodeljuje reservation:cancel:own samo aplikaciji koja ga ima u allowed_scopes', async () => {
    const withScope = await setUp(ALL_SCOPES);
    const withoutScope = await setUp(integrationBody().allowedScopes);
    try {
      const granted = await exchangeAssertion(
        withScope.partner.id,
        signPartnerAssertion({ key: withScope.key, iss: withScope.issuer }),
      );
      expect(granted.status, JSON.stringify(granted.body)).toBe(200);
      expect(scopesOf(granted.body.access_token ?? '').slice().sort()).toEqual([...ALL_SCOPES].sort());

      // Postojeća aplikacija (bez cancel u allowed_scopes) ga ne dobija sama.
      const implicit = await exchangeAssertion(
        withoutScope.partner.id,
        signPartnerAssertion({ key: withoutScope.key, iss: withoutScope.issuer }),
      );
      expect(implicit.status, JSON.stringify(implicit.body)).toBe(200);
      expect(scopesOf(implicit.body.access_token ?? '')).not.toContain(CANCEL_SCOPE);

      // Ni kad ga traži eksplicitno: presek sa allowed_scopes.
      const requested = await exchangeAssertion(
        withoutScope.partner.id,
        signPartnerAssertion({ key: withoutScope.key, iss: withoutScope.issuer }),
        { scope: `reservation:create ${CANCEL_SCOPE}` },
      );
      expect(requested.status, JSON.stringify(requested.body)).toBe(200);
      expect(requested.body.scope).toBe('reservation:create');

      const onlyCancel = await exchangeAssertion(
        withoutScope.partner.id,
        signPartnerAssertion({ key: withoutScope.key, iss: withoutScope.issuer }),
        { scope: CANCEL_SCOPE },
      );
      expect(onlyCancel.status).toBe(400);
      expect(onlyCancel.body.error).toBe('invalid_scope');
      expect(onlyCancel.body.access_token).toBeUndefined();
    } finally {
      await tearDown(withScope);
      await tearDown(withoutScope);
    }
  });

  test('endpoint je u javnom OpenAPI spec-u sa operationId, opisom i security zahtevom', async () => {
    const anonymous = await ApiClient.anonymous();
    try {
      const response = await anonymous.get('/v3/api-docs/public');
      await assertStatus(response, 200, 'GET /v3/api-docs/public');
      const spec = (await response.json()) as {
        paths: Record<
          string,
          Record<string, { operationId?: string; summary?: string; description?: string; security?: unknown[] }>
        >;
      };
      const entry = Object.entries(spec.paths).find(([path]) =>
        path.endsWith('/client-applications/reservations/{id}/cancel'),
      );
      expect(entry, 'putanja cancel u javnom spec-u').toBeDefined();
      const operation = entry?.[1]['post'];
      expect(operation?.operationId).toBe('cancelPartnerReservation');
      expect(operation?.description ?? operation?.summary ?? '').toMatch(/[A-Za-z]{3,}/);
      expect(JSON.stringify(operation?.security ?? [])).toContain(CANCEL_SCOPE);
    } finally {
      await anonymous.dispose();
    }
  });
});
