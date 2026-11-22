// Tiket #437 (epic:106) · Pun MCP OAuth tok protiv staging-a
//
// CIMD klijent (https://reserva.bojanlab.com/e2e/mcp-client-metadata.json) +
// PKCE S256 → alati → poreklo „AI asistent“ → „Ukloni pristup“.
//
// SVESNI IZUZETAK od pravila „bez zavisnosti od demo seed-a“ (odluka na tiketu):
// auth-service mora da preuzme CIMD sa javnog HTTPS-a, pa ovaj spec radi samo nad
// staging-om, sa postojećim demo nalozima (`user-1@demo.reserva.test` i vlasnik
// seedovanog biznisa, ista demo lozinka), bez admina i bez Mailpit-a.
//
// Radi samo kad je E2E_MCP_STAGING=1 (job `mcp-staging`); u `playwright.config.ts`
// je inače u `testIgnore`. Namerno NEMA `@smoke` u nazivu: upisuje podatke.
// CIMD dokument postaje javan tek kad je FE sa `public/e2e/` deploy-ovan.

import { createHash, randomBytes } from 'node:crypto';
import { request, type APIRequestContext, type Page } from '@playwright/test';
import { expect, test, loginInBrowser, submitLoginForm } from '../fixtures/auth';
import { env } from '../env';
import businesses from '../data/demo/businesses.json';

const CLIENT_NAME = 'Reserva E2E';
const REDIRECT_URI = 'http://127.0.0.1:43437/callback';
const SCOPES = 'reservations:read reservations:write';
const MCP_URL = `${env.apiUrl}/mcp`;
const CIMD_URL = `${env.baseUrl}/e2e/mcp-client-metadata.json`;
const BADGE_TEXT = `Rezervisano preko AI asistenta (${CLIENT_NAME})`;

const MCP_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

interface Reservation {
  reservationId: string;
  status: string;
  businessId: string;
  serviceId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  origin: string;
  originClient: string | null;
}

interface ToolResult {
  isError: boolean;
  body: unknown;
}

function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

/** Odgovor može biti JSON ili `text/event-stream` (JSON je u `data:` redu). */
async function parseRpc(response: Awaited<ReturnType<APIRequestContext['post']>>): Promise<any> {
  const text = await response.text();
  if ((response.headers()['content-type'] ?? '').includes('text/event-stream')) {
    const data = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .pop();
    return JSON.parse(data ?? '{}');
  }
  return JSON.parse(text);
}

class McpClient {
  private id = 1;
  constructor(
    private readonly http: APIRequestContext,
    private readonly token: string,
  ) {}

  private async rpc(method: string, params: unknown): Promise<any> {
    const response = await this.http.post(MCP_URL, {
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${this.token}` },
      data: { jsonrpc: '2.0', id: this.id++, method, params },
    });
    expect(response.status(), `MCP ${method}`).toBe(200);
    const json = await parseRpc(response);
    expect(json.error, `MCP ${method}: JSON-RPC greška`).toBeUndefined();
    return json.result;
  }

  initialize() {
    return this.rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'reserva-e2e', version: '1.0.0' },
    });
  }

  async listTools(): Promise<string[]> {
    const result = await this.rpc('tools/list', {});
    return (result.tools as { name: string }[]).map((tool) => tool.name);
  }

  async call(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.rpc('tools/call', { name, arguments: args });
    expect(result.content?.[0]?.type, `${name}: content[0].type`).toBe('text');
    return { isError: result.isError === true, body: JSON.parse(result.content[0].text) };
  }

  /** Poziv koji mora da uspe. */
  async ok<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { isError, body } = await this.call(name, args);
    expect(isError, `${name}: ${JSON.stringify(body)}`).toBe(false);
    return body as T;
  }
}

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Authorize sa CIMD klijentom + PKCE; vraća `code` presretnut na loopback redirect-u. */
async function authorizeInBrowser(page: Page, challenge: string, state: string): Promise<string> {
  let callbackUrl: URL | undefined;
  let notify: () => void = () => undefined;
  const callbackSeen = new Promise<void>((resolve) => (notify = resolve));
  await page.route('http://127.0.0.1:43437/callback**', async (route) => {
    callbackUrl = new URL(route.request().url());
    notify();
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
  });

  const authorizeUrl = new URL(`${env.authUrl}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: CIMD_URL,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: MCP_URL,
  }).toString();

  await page.goto(authorizeUrl.toString());
  await submitLoginForm(page, { email: env.demoEmail, password: env.demoPassword });

  // Saglasnost se traži samo ako je korisnik već nije dao (ostatak ranijeg pokušaja).
  const heading = page.getByRole('heading', { name: /^(Odobri pristup|Authorize access)$/ });
  const next = await Promise.race([
    callbackSeen.then(() => 'callback' as const),
    heading.waitFor({ state: 'visible' }).then(() => 'consent' as const),
  ]);
  if (next === 'consent') {
    await expect(page.locator('.consent-intro strong')).toHaveText(CLIENT_NAME);
    await page.getByRole('button', { name: /^(Dozvoli|Allow)$/ }).click();
    await callbackSeen;
  }

  const url = callbackUrl;
  expect(url, 'redirect na loopback callback').toBeDefined();
  expect(url?.searchParams.get('state'), 'state iz redirect-a').toBe(state);
  const code = url?.searchParams.get('code');
  expect(code, 'code iz redirect-a').toBeTruthy();
  return code as string;
}

async function tokenRequest(http: APIRequestContext, form: Record<string, string>) {
  return http.post(`${env.authUrl}/oauth2/token`, { form });
}

test.describe('MCP: pun OAuth tok (staging)', () => {
  test('CIMD + PKCE → alati → poreklo AI asistent → Ukloni pristup', async ({ page }) => {
    test.setTimeout(180_000);
    const http = await request.newContext();
    const demo = businesses[0]!;
    let mcp: McpClient | undefined;
    let reservationId: string | undefined;
    let cancelled = false;

    try {
      // CIMD dokument je javan.
      const cimd = await http.get(CIMD_URL);
      expect(cimd.status(), 'CIMD dokument').toBe(200);
      const cimdBody = (await cimd.json()) as { client_id: string; client_name: string; grant_types: string[] };
      expect(cimdBody.client_id).toBe(CIMD_URL);
      expect(cimdBody.client_name).toBe(CLIENT_NAME);
      expect(cimdBody.grant_types).toContain('urn:ietf:params:oauth:grant-type:jwt-bearer');

      // 1. 401 + PRM → discovery auth-service-a.
      const unauth = await http.post(MCP_URL, {
        headers: MCP_HEADERS,
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } },
        },
      });
      expect(unauth.status()).toBe(401);
      const prmUrl = /resource_metadata="([^"]+)"/.exec(unauth.headers()['www-authenticate'] ?? '')?.[1];
      expect(prmUrl, 'resource_metadata').toBeTruthy();
      const prm = (await (await http.get(prmUrl as string)).json()) as {
        resource: string;
        authorization_servers: string[];
      };
      expect(prm.resource).toBe(MCP_URL);
      const issuer = new URL(prm.authorization_servers[0] as string);
      const discovery = await http.get(`${issuer.origin}/.well-known/oauth-authorization-server${issuer.pathname}`);
      expect(discovery.status(), 'discovery auth-service-a').toBe(200);
      const metadata = (await discovery.json()) as { authorization_endpoint: string; token_endpoint: string };
      expect(metadata.authorization_endpoint).toContain('/oauth2/authorize');
      expect(metadata.token_endpoint).toContain('/oauth2/token');

      // 2. Authorize (CIMD + PKCE S256) → login → saglasnost → code → token.
      const { verifier, challenge } = pkcePair();
      const state = randomBytes(12).toString('hex');
      const code = await authorizeInBrowser(page, challenge, state);
      const tokenResponse = await tokenRequest(http, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CIMD_URL,
        code_verifier: verifier,
        resource: MCP_URL,
      });
      expect(tokenResponse.status(), `/oauth2/token: ${await tokenResponse.text()}`).toBe(200);
      const tokens = (await tokenResponse.json()) as { access_token: string; refresh_token?: string };
      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token, 'refresh_token').toBeTruthy();

      // 3. Lanac poziva.
      mcp = new McpClient(http, tokens.access_token);
      await mcp.initialize();
      expect(await mcp.listTools()).toEqual(
        expect.arrayContaining([
          'search_businesses',
          'get_business',
          'get_free_slots',
          'create_reservation',
          'list_my_reservations',
          'get_reservation',
          'cancel_reservation',
        ]),
      );

      const found = await mcp.ok<{ businesses: { businessId: string; name: string }[] }>('search_businesses', {
        query: demo.name,
      });
      const match = found.businesses.find((b) => b.name === demo.name);
      expect(match, `search_businesses nije našao „${demo.name}“`).toBeDefined();
      const businessId = match!.businessId;

      const business = await mcp.ok<{
        locations: { resources: { resourceId: string }[] }[];
        services: { serviceId: string; name: string }[];
      }>('get_business', { business_id: businessId });
      const service = business.services.find((s) => s.name === demo.services[0]!.name) ?? business.services[0];
      const resourceId = business.locations[0]?.resources[0]?.resourceId;
      expect(service, 'usluga biznisa').toBeDefined();
      expect(resourceId, 'resurs biznisa').toBeDefined();

      // Termin nekoliko dana unapred (da otkazivanje prođe pravila biznisa).
      let slot: { startTime: string; endTime: string } | undefined;
      for (let offset = 4; offset <= 14 && !slot; offset++) {
        const day = new Date();
        day.setDate(day.getDate() + offset);
        const date = formatLocalDate(day);
        const free = await mcp.ok<{ slots: { startTime: string; endTime: string; status: string }[] }>(
          'get_free_slots',
          { resource_id: resourceId, service_id: service!.serviceId, date },
        );
        slot = free.slots.find((s) => s.status === 'AVAILABLE');
      }
      expect(slot, 'nema slobodnog termina u narednih 14 dana').toBeDefined();

      const created = await mcp.ok<Reservation>('create_reservation', {
        resource_id: resourceId,
        service_id: service!.serviceId,
        start_time: slot!.startTime.slice(0, 16),
        end_time: slot!.endTime.slice(0, 16),
      });
      reservationId = created.reservationId;
      expect(['PENDING_APPROVAL', 'CONFIRMED']).toContain(created.status);
      expect(created.origin).toBe('AI_ASSISTANT');
      expect(created.originClient).toBe(CLIENT_NAME);

      const listed = await mcp.ok<{ reservations: Reservation[] }>('list_my_reservations', {});
      expect(listed.reservations.map((r) => r.reservationId)).toContain(reservationId);

      // 4. Poreklo „AI asistent“ kod korisnika i kod biznisa (pre otkazivanja).
      await loginInBrowser(page, { email: env.demoEmail, password: env.demoPassword });
      await page.evaluate(() => localStorage.setItem('lang', 'sr'));
      await page.goto('/my-reservations');
      await expect(page.getByTestId('reservation-origin-badge').filter({ hasText: BADGE_TEXT }).first()).toBeVisible();

      // 5. „Ukloni pristup“ (pre vlasnika: isti browser, nalog korisnika). Vlasnik ide u čist kontekst.
      await page.goto('/account/ai-assistants');
      const item = page.getByTestId('connected-ai-app-item').filter({ hasText: CLIENT_NAME });
      await expect(item).toHaveCount(1);
      await page.getByRole('button', { name: `Ukloni pristup za ${CLIENT_NAME}` }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Ukloni pristup' }).click();
      await expect(item).toHaveCount(0);

      const refresh = await tokenRequest(http, {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token as string,
        client_id: CIMD_URL,
        resource: MCP_URL,
      });
      expect(refresh.status(), 'refresh posle uklanjanja pristupa').toBe(400);
      expect(((await refresh.json()) as { error: string }).error).toBe('invalid_grant');

      // Strana biznisa: vlasnik seedovanog biznisa vidi isto poreklo.
      const ownerContext = await page.context().browser()!.newContext({ locale: 'en-US' });
      try {
        const ownerPage = await ownerContext.newPage();
        await loginInBrowser(ownerPage, { email: demo.ownerEmail, password: env.demoPassword });
        await ownerPage.evaluate(() => localStorage.setItem('lang', 'sr'));
        await ownerPage.goto('/dashboard/reservations');
        await expect(
          ownerPage.getByTestId('reservation-origin-badge').filter({ hasText: BADGE_TEXT }).first(),
        ).toBeVisible();
      } finally {
        await ownerContext.close();
      }

      // Access token (JWT, 15 min) važi do isteka: koristi se za otkazivanje.
      const result = await mcp.ok<Reservation>('cancel_reservation', { reservation_id: reservationId });
      cancelled = true;
      expect(result.status).toBe('CANCELLED');
    } finally {
      if (mcp && reservationId && !cancelled) {
        await mcp.call('cancel_reservation', { reservation_id: reservationId }).catch(() => undefined);
      }
      await http.dispose();
    }
  });
});
