import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, request, type APIResponse } from '@playwright/test';
import { env } from '../env';
import { assertWritable, ApiClient, uniqueEmail, uniqueName } from './api';
import {
  addResourceToLocation,
  addServiceToLocation,
  listLocationResourceIds,
  listLocationServiceIds,
} from '../scripts/seedApi';

export const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
export const ID_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:id_token';

export interface BusinessDto {
  id: string;
  name: string;
}

export interface LocationDto {
  id: string;
  name: string;
}

export interface ClientApplicationDto {
  id: string;
  name: string;
  enabled: boolean;
  scope: { type: string; [key: string]: unknown };
}

export interface ConsentDto {
  id: string;
  clientApplicationId: string;
  locationId: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
}

export interface ClientApplicationDetailDto extends ClientApplicationDto {
  consents: ConsentDto[];
}

export interface OwnerConsentDto {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  clientApplication: ClientApplicationDto;
  location: { id: string; businessId: string };
}

export interface IntegrationBody {
  trustedIssuers: { type: 'OIDC' | 'PARTNER_KEY'; issuer: string; jwksUri: string | null; inlineJwk?: string | null; audiences: string[] }[];
  allowedOrigins: string[];
  allowedScopes: string[];
}

/** `expect`-free provera statusa sa telom u poruci, da CI log kaže zašto poziv nije uspeo. */
export async function assertStatus(response: APIResponse, expected: number, label: string): Promise<void> {
  if (response.status() !== expected) {
    throw new Error(`${label}: očekivan HTTP ${expected}, stiglo ${response.status()} ${await response.text()}`);
  }
}

/** `POST /businesses/admin` traži pravi `User.id`, ne JWT `sub` (admin pretraga naloga). */
export async function fetchUserId(adminApi: ApiClient, email: string): Promise<string> {
  const response = await adminApi.auth.get('users/admin/accounts', { params: { search: email } });
  await assertStatus(response, 200, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as { content: { id: string; email: string }[] };
  const match = page.content.find((u) => u.email === email);
  if (!match) throw new Error(`korisnik ${email} nije pronađen u admin pretrazi`);
  return match.id;
}

/** Aktivan biznis (admin kreacija) sa jednom lokacijom; vraća biznis i tu lokaciju. */
export async function createBusinessWithLocation(
  adminApi: ApiClient,
  ownerId: string,
  namePrefix: string,
): Promise<{ business: BusinessDto; location: LocationDto }> {
  const created = await adminApi.post('/businesses/admin', {
    data: {
      name: uniqueName(namePrefix),
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
  await assertStatus(created, 200, 'POST /businesses/admin');
  const business = (await created.json()) as BusinessDto;
  const locations = await adminApi.get(`/businesses/${business.id}/locations`);
  await assertStatus(locations, 200, `GET /businesses/${business.id}/locations`);
  const [location] = (await locations.json()) as LocationDto[];
  if (!location) throw new Error('očekivana bar jedna lokacija na novom biznisu');
  return { business, location };
}

/** Registruje partnera (klijentsku aplikaciju) sa `LOCATION_LIST` opsegom. */
export async function registerPartner(
  adminApi: ApiClient,
  locationIds: string[],
  namePrefix = 'E2E Partner',
): Promise<ClientApplicationDto> {
  const created = await adminApi.post('/admin/client-applications', {
    data: { name: uniqueName(namePrefix), scope: { type: 'LOCATION_LIST', locationIds } },
  });
  await assertStatus(created, 200, 'POST /admin/client-applications');
  return (await created.json()) as ClientApplicationDto;
}

export function integrationBody(overrides: Partial<IntegrationBody> = {}): IntegrationBody {
  return {
    trustedIssuers: [
      {
        type: 'OIDC',
        issuer: 'https://issuer.e2e.reserva.test',
        jwksUri: 'https://issuer.e2e.reserva.test/jwks.json',
        inlineJwk: null,
        audiences: ['e2e-partner-audience'],
      },
    ],
    allowedOrigins: ['https://partner.e2e.reserva.test'],
    allowedScopes: ['reservation:create', 'reservation:read:own'],
    ...overrides,
  };
}

export async function saveIntegration(
  adminApi: ApiClient,
  clientApplicationId: string,
  body: IntegrationBody = integrationBody(),
): Promise<void> {
  const response = await adminApi.auth.put(`admin/client-applications/${clientApplicationId}/integration`, {
    data: body,
  });
  await assertStatus(response, 200, `PUT /auth/admin/client-applications/${clientApplicationId}/integration`);
}

export async function fetchDetail(adminApi: ApiClient, id: string): Promise<ClientApplicationDetailDto> {
  const response = await adminApi.get(`/admin/client-applications/${id}`);
  await assertStatus(response, 200, `GET /admin/client-applications/${id}`);
  return (await response.json()) as ClientApplicationDetailDto;
}

export async function fetchOwnerConsents(ownerApi: ApiClient): Promise<OwnerConsentDto[]> {
  const response = await ownerApi.get('/client-application-consents');
  await assertStatus(response, 200, 'GET /client-application-consents');
  return (await response.json()) as OwnerConsentDto[];
}

function base64Url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

/**
 * Potpisuje ID token nasumičnim RSA ključem koji nijedan izdavalac ne poznaje —
 * koristi se samo za slučajeve u kojima auth-service MORA da odbije token.
 * (Uspešna zamena traži test OIDC izdavaoca u `compose.e2e.yml`.)
 */
export function signIdTokenWithUnknownKey(claims: { iss: string; aud: string; email?: string }): string {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'e2e-unknown-key' }));
  const payload = base64Url(
    JSON.stringify({
      iss: claims.iss,
      aud: claims.aud,
      sub: `sub-${uniqueName('s').replace(/\s+/g, '-')}`,
      email: claims.email ?? uniqueEmail('idp'),
      email_verified: true,
      iat: now,
      exp: now + 300,
    }),
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(privateKey);
  return `${header}.${payload}.${base64Url(signature)}`;
}

export interface TokenExchangeResult {
  status: number;
  body: {
    error?: string;
    error_description?: string;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    issued_token_type?: string;
    refresh_token?: string;
  };
}

// ---------------------------------------------------------------------------
// Test OIDC izdavalac (`oidc-issuer` u compose.e2e.yml)
//
// SAMO ZA E2E. Privatni ključ nastaje u CI-ju (`e2e/oidc-issuer/generate-keys.mjs`,
// gitignore) i nigde se drugde ne koristi; javni deo sa `kid` servira `oidc-issuer`.
// ---------------------------------------------------------------------------

export const OIDC_KID = 'e2e-test-key-1';
export const OIDC_ISSUER = env.oidcIssuer;
export const OIDC_JWKS_URI = `${OIDC_ISSUER}/jwks.json`;

function testPrivateKey(): string {
  // Playwright i seed se uvek pokreću iz `e2e/` (`yarn --cwd e2e ...`); `import.meta` ne radi u CJS buildu seed-a.
  return readFileSync(resolve(process.cwd(), 'oidc-issuer/private/test-private-key.pem'), 'utf8');
}

export interface IdTokenOptions {
  /** `aud` claim; mora da se poklopi sa audience-om u integraciji partnera. */
  aud: string;
  iss?: string;
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  /** Sekundi do isteka; negativna vrednost daje već istekao token. */
  expiresInSeconds?: number;
  /** Potpis nasumičnim ključem uz `kid` test ključa — potpis ne sme da prođe proveru. */
  badSignature?: boolean;
}

/** ID token potpisan test ključem izdavaoca (RS256, `kid` = `OIDC_KID`). */
export function signOidcIdToken(options: IdTokenOptions): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: OIDC_KID }));
  const payload = base64Url(
    JSON.stringify({
      iss: options.iss ?? OIDC_ISSUER,
      aud: options.aud,
      sub: options.sub ?? uniqueSubject(),
      email: options.email ?? uniqueEmail('idp'),
      email_verified: options.emailVerified ?? true,
      iat: now - 5,
      exp: now + (options.expiresInSeconds ?? 300),
    }),
  );
  const key = options.badSignature
    ? generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
    : testPrivateKey();
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(key);
  return `${header}.${payload}.${base64Url(signature)}`;
}

export function uniqueSubject(): string {
  return `sub-${uniqueName('s').replace(/\s+/g, '-')}`;
}

export function uniqueAudience(): string {
  return `aud-${uniqueName('a').replace(/\s+/g, '-')}`;
}

/** Integracija partnera koja veruje test OIDC izdavaocu. */
export function oidcIntegrationBody(audience: string, overrides: Partial<IntegrationBody> = {}): IntegrationBody {
  return integrationBody({
    trustedIssuers: [{ type: 'OIDC', issuer: OIDC_ISSUER, jwksUri: OIDC_JWKS_URI, audiences: [audience] }],
    ...overrides,
  });
}

/** Zamena ID tokena partnera za partnerski access token (javni klijent = `client_id` partnera). */
export function exchangeIdToken(
  partnerId: string,
  idToken: string,
  extra: Record<string, string> = {},
): Promise<TokenExchangeResult> {
  return exchangeToken({
    client_id: partnerId,
    subject_token_type: ID_TOKEN_TYPE,
    subject_token: idToken,
    ...extra,
  });
}

/** Claim-ovi JWT-a bez provere potpisa (samo za asercije u testu). */
export function decodeJwtClaims(jwt: string): Record<string, unknown> {
  const payload = jwt.split('.')[1];
  if (!payload) throw new Error('JWT bez payload dela');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

/** Partnerski HTTP klijent: bearer = partnerski access token, bazni URL = resource-service. */
export async function partnerApi(accessToken: string): Promise<PartnerApi> {
  const http = await request.newContext({
    baseURL: `${env.apiUrl}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  return new PartnerApi(http);
}

export class PartnerApi {
  constructor(private readonly http: Awaited<ReturnType<typeof request.newContext>>) {}
  get(path: string) {
    return this.http.get(path.replace(/^\//, ''));
  }
  post(path: string, data?: unknown) {
    return this.http.post(path.replace(/^\//, ''), data === undefined ? undefined : { data });
  }
  dispose() {
    return this.http.dispose();
  }
}

export interface PartnerReservationDto {
  id: string;
  userId: string | null;
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface BookableLocation {
  business: BusinessDto;
  location: LocationDto;
  serviceId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

/**
 * Biznis (admin kreacija) sa jednom lokacijom, uslugom od 30 min i resursom koji radi
 * 08:00–20:00 datog dana (za 2 dana unapred), spreman za rezervaciju u 08:00. Usluga i
 * resurs se vezuju za lokaciju (ako već nisu), jer partnerska rezervacija nosi `locationId`.
 */
export async function createBookableLocation(adminApi: ApiClient, ownerId: string): Promise<BookableLocation> {
  const { business, location } = await createBusinessWithLocation(adminApi, ownerId, 'E2E Partner token');

  const service = await adminApi.post(`/businesses/${business.id}/services`, {
    data: { name: uniqueName('E2E Usluga'), minDuration: 30, maxDuration: 30, durationUnit: 'MINUTES', durationStep: 15 },
  });
  await assertStatus(service, 200, `POST /businesses/${business.id}/services`);
  const serviceId = ((await service.json()) as { id: string }).id;

  const resource = await adminApi.post(`/businesses/${business.id}/resources`, {
    data: { id: null, businessId: business.id, type: 'EMPLOYEE', name: uniqueName('E2E Resurs') },
  });
  await assertStatus(resource, 200, `POST /businesses/${business.id}/resources`);
  const resourceId = ((await resource.json()) as { id: string }).id;

  if (!(await listLocationServiceIds(adminApi, business.id, location.id)).includes(serviceId)) {
    await addServiceToLocation(adminApi, business.id, location.id, serviceId);
  }
  if (!(await listLocationResourceIds(adminApi, business.id, location.id)).includes(resourceId)) {
    await addResourceToLocation(adminApi, business.id, location.id, resourceId);
  }

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 2);
  const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const dayOfWeek = DAYS[(target.getDay() + 6) % 7];

  const rule = await adminApi.post(`/resources/${resourceId}/availability-rules`, {
    data: { id: null, resourceId, dayOfWeek, startTime: '08:00', endTime: '20:00' },
  });
  await assertStatus(rule, 200, `POST /resources/${resourceId}/availability-rules`);

  const [year, month] = dateStr.split('-').map(Number) as [number, number];
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  await expect
    .poll(
      async () => {
        const response = await adminApi.get(`/resources/${resourceId}/slots`, { params: { serviceId, from, to } });
        if (!response.ok()) return false;
        const slots = (await response.json()) as { startTime: string; status: string }[];
        return slots.some((s) => s.startTime === `${dateStr}T08:00:00` && s.status === 'AVAILABLE');
      },
      { timeout: 20_000, message: `slot ${dateStr}T08:00 nije postao slobodan` },
    )
    .toBe(true);

  return {
    business,
    location,
    serviceId,
    resourceId,
    startTime: `${dateStr}T08:00:00`,
    endTime: `${dateStr}T08:30:00`,
  };
}

/** Telo `POST /client-applications/reservations` (CreateReservationByClientApplicationRequest). */
export function partnerReservationBody(bookable: BookableLocation) {
  return {
    resourceId: bookable.resourceId,
    locationId: bookable.location.id,
    serviceId: bookable.serviceId,
    startTime: bookable.startTime,
    endTime: bookable.endTime,
  };
}

/** Odobrava saglasnost vlasnika za datog partnera na datoj lokaciji. */
export async function approveConsent(ownerApi: ApiClient, partnerId: string): Promise<ConsentIdentity> {
  const consent = (await fetchOwnerConsents(ownerApi)).find((c) => c.clientApplication.id === partnerId);
  if (!consent) throw new Error(`vlasnik ne vidi saglasnost za partnera ${partnerId}`);
  await assertStatus(await ownerApi.post(`/client-application-consents/${consent.id}/approve`), 200, 'approve consent');
  return { id: consent.id };
}

export interface ConsentIdentity {
  id: string;
}

export async function revokeConsent(ownerApi: ApiClient, consentId: string): Promise<void> {
  await assertStatus(await ownerApi.post(`/client-application-consents/${consentId}/revoke`), 200, 'revoke consent');
}

/** `POST /oauth2/token` token-exchange kao javni klijent (samo `client_id`, bez secret-a). */
export async function exchangeToken(params: Record<string, string>): Promise<TokenExchangeResult> {
  assertWritable('POST /oauth2/token (token exchange)');
  const http = await request.newContext();
  try {
    const response = await http.post(`${env.authUrl}/oauth2/token`, {
      form: { grant_type: TOKEN_EXCHANGE_GRANT, ...params },
    });
    return { status: response.status(), body: (await response.json()) as TokenExchangeResult['body'] };
  } finally {
    await http.dispose();
  }
}

// ---------------------------------------------------------------------------
// Put 2: partner potpisuje tvrdnju o identitetu (PARTNER_KEY)
//
// Test sam pravi EC P-256 par ključeva; javni deo se registruje kao inline JWK.
// ---------------------------------------------------------------------------

export const JWT_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:jwt';
export const RESERVA_ASSERTION_AUDIENCE = 'reserva';

export interface PartnerKeyPair {
  privateKey: KeyObject;
  /** Javni JWK kao JSON string (za `inlineJwk`). */
  inlineJwk: string;
}

export function generatePartnerKey(): PartnerKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { privateKey, inlineJwk: JSON.stringify(publicKey.export({ format: 'jwk' })) };
}

export interface PartnerAssertionOptions {
  key: PartnerKeyPair;
  /** Registrovani PARTNER_KEY `issuer`. */
  iss: string;
  aud?: string;
  sub?: string;
  email?: string;
  /** `null` izostavlja `jti`. */
  jti?: string | null;
  /** Sekundi do isteka (podrazumevano 120). */
  expiresInSeconds?: number;
}

export function uniqueJti(): string {
  return `jti-${uniqueName('j').replace(/\s+/g, '-')}`;
}

export function uniquePartnerIssuer(): string {
  return `partner-${uniqueName('iss').replace(/\s+/g, '-')}`;
}

/** Tvrdnja partnerovog backenda (ES256) za `subject_token_type = jwt`. */
export function signPartnerAssertion(options: PartnerAssertionOptions): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: options.iss,
    sub: options.sub ?? uniqueSubject(),
    aud: options.aud ?? RESERVA_ASSERTION_AUDIENCE,
    email: options.email ?? uniqueEmail('idp'),
    iat: now - 5,
    exp: now + (options.expiresInSeconds ?? 120),
  };
  if (options.jti !== null) claims['jti'] = options.jti ?? uniqueJti();
  const header = base64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify(claims));
  const signature = createSign('SHA256')
    .update(`${header}.${payload}`)
    .sign({ key: options.key.privateKey, dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${base64Url(signature)}`;
}

/** Integracija sa jednim PARTNER_KEY izdavaocem (inline JWK). */
export function partnerKeyIntegrationBody(issuer: string, key: PartnerKeyPair): IntegrationBody {
  return integrationBody({
    trustedIssuers: [{ type: 'PARTNER_KEY', issuer, jwksUri: null, inlineJwk: key.inlineJwk, audiences: [] }],
  });
}

/** Zamena partnerske tvrdnje za partnerski access token. */
export function exchangeAssertion(
  partnerId: string,
  assertion: string,
  extra: Record<string, string> = {},
): Promise<TokenExchangeResult> {
  return exchangeToken({ client_id: partnerId, subject_token_type: JWT_TOKEN_TYPE, subject_token: assertion, ...extra });
}
