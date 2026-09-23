import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { env } from '../env';
import { activationLink } from './mailpit';

export interface Credentials {
  email: string;
  password: string;
}

/** Jedinstven email za nalog koji test pravi (rezervisan `.test` TLD, mejl ne odlazi napolje). */
export function uniqueEmail(prefix = 'user'): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${suffix}@e2e.reserva.test`;
}

/** Jedinstven naziv (biznis, usluga...) da testovi ne zavise jedan od drugog. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function locationOf(response: APIResponse): string {
  const location = response.headers()['location'];
  if (!location) {
    throw new Error(`očekivan redirect, a stiglo je HTTP ${response.status()} sa ${response.url()}`);
  }
  return new URL(location, response.url()).toString();
}

/**
 * Access token kroz pravi OAuth tok (authorization code, bez browsera) —
 * isti put kojim ide FE, bez ikakvog backdoor-a u BE:
 * authorize → login forma → authorize → redirect sa `code` → /oauth2/token.
 */
export async function fetchAccessToken(credentials: Credentials): Promise<string> {
  const http = await request.newContext({ maxRedirects: 0 });
  try {
    const authorizeUrl = new URL(`${env.authUrl}/oauth2/authorize`);
    authorizeUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: env.oauthClientId,
      redirect_uri: env.oauthRedirectUri,
      scope: 'openid profile read write',
    }).toString();

    const toLogin = await http.get(authorizeUrl.toString());
    const loginUrl = locationOf(toLogin);

    const loginPage = await http.get(loginUrl);
    const html = await loginPage.text();
    const csrf = /name="_csrf"\s+value="([^"]+)"/.exec(html)?.[1];

    const form: Record<string, string> = {
      username: credentials.email,
      password: credentials.password,
    };
    if (csrf) form['_csrf'] = csrf;
    const afterLogin = await http.post(loginUrl, { form });
    const next = locationOf(afterLogin);
    if (next.includes('error')) {
      throw new Error(`login nije uspeo za ${credentials.email}`);
    }

    const toCallback = await http.get(next);
    const code = new URL(locationOf(toCallback)).searchParams.get('code');
    if (!code) {
      throw new Error(`authorize nije vratio code za ${credentials.email}`);
    }

    const tokenResponse = await http.post(`${env.authUrl}/oauth2/token`, {
      form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.oauthRedirectUri,
        client_id: env.oauthClientId,
        client_secret: env.oauthClientSecret,
      },
    });
    if (!tokenResponse.ok()) {
      throw new Error(`/oauth2/token: HTTP ${tokenResponse.status()} ${await tokenResponse.text()}`);
    }
    const body = (await tokenResponse.json()) as { access_token: string };
    return body.access_token;
  } finally {
    await http.dispose();
  }
}

/**
 * Registruje nalog kroz javni API i aktivira ga linkom iz Mailpit-a, kao pravi
 * korisnik. Radi samo nad stackom sa Mailpit-om (CI), ne nad staging-om.
 */
export async function createActivatedUser(
  overrides: Partial<Credentials & { firstName: string; lastName: string }> = {},
): Promise<Credentials> {
  const credentials: Credentials = {
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? env.userPassword,
  };
  const http = await request.newContext();
  try {
    const response = await http.post(`${env.authUrl}/users/register`, {
      data: {
        email: credentials.email,
        password: credentials.password,
        firstName: overrides.firstName ?? 'E2E',
        lastName: overrides.lastName ?? 'Korisnik',
      },
    });
    if (!response.ok()) {
      throw new Error(`registracija ${credentials.email}: HTTP ${response.status()} ${await response.text()}`);
    }
    const activation = await http.get(await activationLink(credentials.email), { maxRedirects: 0 });
    const location = activation.headers()['location'] ?? '';
    if (activation.status() >= 400 || location.includes('error=')) {
      throw new Error(`aktivacija ${credentials.email} nije uspela (${activation.status()} ${location})`);
    }
  } finally {
    await http.dispose();
  }
  return credentials;
}

/** Admin iz bootstrap-a (`ADMIN_BOOTSTRAP_*`), nikad lični admin. */
export function adminCredentials(): Credentials {
  if (!env.adminPassword) {
    throw new Error('E2E_ADMIN_PASSWORD nije postavljen');
  }
  return { email: env.adminEmail, password: env.adminPassword };
}

/**
 * Klijent za pripremu podataka u testovima. Putanje su relativne:
 * `api.get('/businesses/...')` ide na resource-service, `api.auth.get('/users/...')`
 * na auth-service.
 */
export class ApiClient {
  private constructor(
    private readonly http: APIRequestContext,
    readonly auth: APIRequestContext,
  ) {}

  static async as(credentials: Credentials): Promise<ApiClient> {
    const token = await fetchAccessToken(credentials);
    const headers = { Authorization: `Bearer ${token}` };
    const http = await request.newContext({ baseURL: `${env.apiUrl}/`, extraHTTPHeaders: headers });
    const auth = await request.newContext({ baseURL: `${env.authUrl}/`, extraHTTPHeaders: headers });
    return new ApiClient(http, auth);
  }

  static async anonymous(): Promise<ApiClient> {
    const http = await request.newContext({ baseURL: `${env.apiUrl}/` });
    const auth = await request.newContext({ baseURL: `${env.authUrl}/` });
    return new ApiClient(http, auth);
  }

  get(path: string, options?: Parameters<APIRequestContext['get']>[1]) {
    return this.http.get(path.replace(/^\//, ''), options);
  }
  post(path: string, options?: Parameters<APIRequestContext['post']>[1]) {
    return this.http.post(path.replace(/^\//, ''), options);
  }
  put(path: string, options?: Parameters<APIRequestContext['put']>[1]) {
    return this.http.put(path.replace(/^\//, ''), options);
  }
  patch(path: string, options?: Parameters<APIRequestContext['patch']>[1]) {
    return this.http.patch(path.replace(/^\//, ''), options);
  }
  delete(path: string, options?: Parameters<APIRequestContext['delete']>[1]) {
    return this.http.delete(path.replace(/^\//, ''), options);
  }

  async dispose(): Promise<void> {
    await this.http.dispose();
    await this.auth.dispose();
  }
}
