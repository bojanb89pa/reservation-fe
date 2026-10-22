// epic:77 · Faza 2 / D: put 2 — partner potpisuje tvrdnju o identitetu (PARTNER_KEY)
//
// Pokriveno: admin API čuva PARTNER_KEY izdavaoca sa inline JWK-om (i odbija neispravne
// kombinacije), uspešna zamena tvrdnje (ES256) i rezervacija sa `externalIdentityId`,
// odbijanja (potpis, aud, istekla, predug exp, bez jti, ponovljen jti, nepoznat izdavalac
// i partner, pogrešan tip tokena), isključen partner i da se email iz tvrdnje ne vezuje
// za postojeći nalog.
//
// NIJE pokriveno: JWKS URL varijanta (traži partnerov JWKS endpoint koji compose.e2e.yml
// ne servira) i tekst uputstva za integraciju (dokumentacija, ne ponašanje).

import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/auth';
import { ApiClient, adminCredentials, createActivatedUser, uniqueEmail } from '../fixtures/api';
import {
  approveConsent,
  assertStatus,
  createBookableLocation,
  createBusinessWithLocation,
  decodeJwtClaims,
  exchangeAssertion,
  exchangeToken,
  fetchDetail,
  fetchUserId,
  generatePartnerKey,
  integrationBody,
  JWT_TOKEN_TYPE,
  partnerApi,
  partnerKeyIntegrationBody,
  partnerReservationBody,
  registerPartner,
  saveIntegration,
  signPartnerAssertion,
  uniqueJti,
  uniquePartnerIssuer,
  uniqueSubject,
  type BookableLocation,
  type ClientApplicationDto,
  type PartnerKeyPair,
  type PartnerReservationDto,
} from '../fixtures/partners';

interface KeySetup {
  adminApi: ApiClient;
  ownerApi: ApiClient;
  partner: ClientApplicationDto;
  bookable: BookableLocation;
  issuer: string;
  key: PartnerKeyPair;
}

async function setUpKeyPartner(namePrefix: string): Promise<KeySetup> {
  const adminApi = await ApiClient.as(adminCredentials());
  const owner = await createActivatedUser();
  const ownerApi = await ApiClient.as(owner);
  const ownerId = await fetchUserId(adminApi, owner.email);
  const bookable = await createBookableLocation(adminApi, ownerId);
  const partner = await registerPartner(adminApi, [bookable.location.id], namePrefix);
  const issuer = uniquePartnerIssuer();
  const key = generatePartnerKey();
  await saveIntegration(adminApi, partner.id, partnerKeyIntegrationBody(issuer, key));
  return { adminApi, ownerApi, partner, bookable, issuer, key };
}

async function tearDown(setup: KeySetup): Promise<void> {
  await setup.ownerApi.dispose();
  await setup.adminApi.dispose();
}

test.describe('epic:77 admin API: PARTNER_KEY izdavalac', () => {
  test('čuva inline JWK tačno kako je poslat; odbija neispravne kombinacije', async () => {
    const adminApi = await ApiClient.as(adminCredentials());
    try {
      const owner = await createActivatedUser();
      const ownerId = await fetchUserId(adminApi, owner.email);
      const { location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner PARTNER_KEY admin');
      const partner = await registerPartner(adminApi, [location.id], 'E2E Partner PARTNER_KEY admin');
      const issuer = uniquePartnerIssuer();
      const key = generatePartnerKey();
      await saveIntegration(adminApi, partner.id, partnerKeyIntegrationBody(issuer, key));

      const readIssuers = async () => {
        const read = await adminApi.auth.get(`admin/client-applications/${partner.id}/integration`);
        await assertStatus(read, 200, 'GET integration');
        return ((await read.json()) as {
          trustedIssuers: { type: string; issuer: string; jwksUri: string | null; inlineJwk: string | null }[];
        }).trustedIssuers;
      };
      const saved = await readIssuers();
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ type: 'PARTNER_KEY', issuer, inlineJwk: key.inlineJwk });
      expect(saved[0]?.jwksUri ?? null).toBeNull();

      const put = (trustedIssuers: Record<string, unknown>[]) =>
        adminApi.auth.put(`admin/client-applications/${partner.id}/integration`, {
          data: { ...integrationBody(), trustedIssuers },
        });
      const partnerKeyIssuer = (extra: Record<string, unknown>) => ({
        type: 'PARTNER_KEY',
        issuer,
        audiences: [],
        ...extra,
      });

      expect((await put([partnerKeyIssuer({ jwksUri: null, inlineJwk: null })])).status()).toBe(400);
      expect(
        (
          await put([
            partnerKeyIssuer({ jwksUri: 'https://partner.e2e.reserva.test/jwks.json', inlineJwk: key.inlineJwk }),
          ])
        ).status(),
      ).toBe(400);
      expect((await put([partnerKeyIssuer({ jwksUri: null, inlineJwk: '{"kty":"oct","k":"abc"}' })])).status()).toBe(400);
      expect((await put([partnerKeyIssuer({ jwksUri: '/jwks.json', inlineJwk: null })])).status()).toBe(400);
      expect(
        (
          await put([
            {
              type: 'OIDC',
              issuer: 'https://issuer.e2e.reserva.test',
              jwksUri: null,
              inlineJwk: key.inlineJwk,
              audiences: ['x'],
            },
          ])
        ).status(),
      ).toBe(422);

      // Ništa od odbijenog nije sačuvano.
      expect((await readIssuers()).map((i) => i.issuer)).toEqual([issuer]);
    } finally {
      await adminApi.dispose();
    }
  });
});

test.describe('epic:77 token exchange: partnerska tvrdnja (put 2)', () => {
  test('tvrdnja potpisana ključem partnera daje token kojim se pravi rezervacija sa externalIdentityId', async () => {
    const setup = await setUpKeyPartner('E2E Partner put 2');
    try {
      const { partner, issuer, key, ownerApi, bookable } = setup;
      const subject = uniqueSubject();
      const email = uniqueEmail('guest');
      const exchange = await exchangeAssertion(
        partner.id,
        signPartnerAssertion({ key, iss: issuer, sub: subject, email }),
      );
      expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
      expect(exchange.body.token_type).toBe('Bearer');
      expect(exchange.body.refresh_token).toBeUndefined();

      const claims = decodeJwtClaims(exchange.body.access_token ?? '');
      expect(claims['clientApplicationId']).toBe(partner.id);
      expect(claims['externalIdentityId']).toEqual(expect.any(String));
      expect(claims['guestEmail']).toBe(email);
      expect(claims['linkedUserId'] ?? null).toBeNull();

      await approveConsent(ownerApi, partner.id);
      const api = await partnerApi(exchange.body.access_token ?? '');
      try {
        const created = await api.post('/client-applications/reservations', partnerReservationBody(bookable));
        await assertStatus(created, 200, 'POST /client-applications/reservations');
        const reservation = (await created.json()) as PartnerReservationDto;
        expect(reservation.id).toEqual(expect.any(String));
      } finally {
        await api.dispose();
      }

      // Isti subject (nov jti) daje isti identitet.
      const again = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer, sub: subject }));
      expect(again.status, JSON.stringify(again.body)).toBe(200);
      expect(decodeJwtClaims(again.body.access_token ?? '')['externalIdentityId']).toBe(claims['externalIdentityId']);
    } finally {
      await tearDown(setup);
    }
  });

  test('odbija pogrešan potpis, pogrešan aud, isteklu, predug exp, tvrdnju bez jti i nepoznatog izdavaoca', async () => {
    const setup = await setUpKeyPartner('E2E Partner put 2 odbijanja');
    try {
      const { partner, issuer, key } = setup;
      const rejected = async (assertion: string, label: string) => {
        const result = await exchangeAssertion(partner.id, assertion);
        expect(result.status, label).toBe(400);
        expect(result.body.error, label).toBe('invalid_grant');
        expect(result.body.access_token, label).toBeUndefined();
      };

      await rejected(signPartnerAssertion({ key: generatePartnerKey(), iss: issuer }), 'pogrešan potpis');
      await rejected(signPartnerAssertion({ key, iss: issuer, aud: 'neko-drugi' }), 'pogrešan aud');
      await rejected(signPartnerAssertion({ key, iss: issuer, expiresInSeconds: -3600 }), 'istekla');
      await rejected(signPartnerAssertion({ key, iss: issuer, expiresInSeconds: 3600 }), 'predug exp');
      await rejected(signPartnerAssertion({ key, iss: issuer, jti: null }), 'bez jti');
      await rejected(signPartnerAssertion({ key, iss: 'nepoznat-izdavalac' }), 'nepoznat izdavalac');

      // Kontrola: ispravna tvrdnja istog partnera prolazi.
      const valid = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer }));
      expect(valid.status, JSON.stringify(valid.body)).toBe(200);
    } finally {
      await tearDown(setup);
    }
  });

  test('ponovljen jti se odbija, nov jti prolazi', async () => {
    const setup = await setUpKeyPartner('E2E Partner put 2 jti');
    try {
      const { partner, issuer, key } = setup;
      const jti = uniqueJti();
      const first = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer, jti }));
      expect(first.status, JSON.stringify(first.body)).toBe(200);

      const replay = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer, jti }));
      expect(replay.status).toBe(400);
      expect(replay.body.error).toBe('invalid_grant');
      expect(replay.body.access_token).toBeUndefined();

      const fresh = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer }));
      expect(fresh.status, JSON.stringify(fresh.body)).toBe(200);
    } finally {
      await tearDown(setup);
    }
  });

  test('nepoznat partner i pogrešan subject_token_type su odbijeni', async () => {
    const setup = await setUpKeyPartner('E2E Partner put 2 klijent');
    try {
      const { partner, issuer, key } = setup;
      const unknown = await exchangeAssertion(randomUUID(), signPartnerAssertion({ key, iss: issuer }));
      expect(unknown.status).toBeGreaterThanOrEqual(400);
      expect(unknown.body.error).toBe('invalid_client');
      expect(unknown.body.access_token).toBeUndefined();

      const wrongType = await exchangeToken({
        client_id: partner.id,
        subject_token_type: `${JWT_TOKEN_TYPE}-nepoznat`,
        subject_token: signPartnerAssertion({ key, iss: issuer }),
      });
      expect(wrongType.status).toBe(400);
      expect(wrongType.body.error).toBe('invalid_request');
      expect(wrongType.body.access_token).toBeUndefined();
    } finally {
      await tearDown(setup);
    }
  });

  test('isključen partner ne može da zameni tvrdnju; ponovo uključen može', async () => {
    const setup = await setUpKeyPartner('E2E Partner put 2 isključen');
    try {
      const { partner, issuer, key, adminApi } = setup;
      await assertStatus(
        await adminApi.patch(`/admin/client-applications/${partner.id}`, { data: { enabled: false } }),
        200,
        'PATCH enabled=false',
      );
      expect((await fetchDetail(adminApi, partner.id)).enabled).toBe(false);

      const rejected = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer }));
      expect(rejected.status).toBeGreaterThanOrEqual(400);
      expect(rejected.body.error).toBe('invalid_client');
      expect(rejected.body.access_token).toBeUndefined();

      await assertStatus(
        await adminApi.patch(`/admin/client-applications/${partner.id}`, { data: { enabled: true } }),
        200,
        'PATCH enabled=true',
      );
      const accepted = await exchangeAssertion(partner.id, signPartnerAssertion({ key, iss: issuer }));
      expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    } finally {
      await tearDown(setup);
    }
  });

  test('email postojećeg Reserva korisnika u tvrdnji se ne vezuje za njegov nalog', async () => {
    const setup = await setUpKeyPartner('E2E Partner put 2 email');
    try {
      const { partner, issuer, key } = setup;
      const existing = await createActivatedUser();
      const exchange = await exchangeAssertion(
        partner.id,
        signPartnerAssertion({ key, iss: issuer, email: existing.email }),
      );
      expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
      const claims = decodeJwtClaims(exchange.body.access_token ?? '');
      expect(claims['guestEmail']).toBe(existing.email);
      expect(claims['linkedUserId'] ?? null).toBeNull();
    } finally {
      await tearDown(setup);
    }
  });
});
