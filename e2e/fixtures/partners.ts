import { createSign, generateKeyPairSync } from 'node:crypto';
import { request, type APIResponse } from '@playwright/test';
import { env } from '../env';
import { assertWritable, ApiClient, uniqueEmail, uniqueName } from './api';

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
  trustedIssuers: { type: 'OIDC' | 'PARTNER_KEY'; issuer: string; jwksUri: string | null; audiences: string[] }[];
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
  body: { error?: string; error_description?: string; access_token?: string };
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
