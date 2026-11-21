// Kontrolni tiket #98 (epic:98) · MCP M3: MCP server u resource-service-u
//
// Pokriva deo kriterijuma koji ne traži MCP token: 401 sa `resource_metadata`,
// Protected Resource Metadata (RFC 9728) i odbijanje REST tokena na `/mcp`.
// MCP token (aud = MCP URI, CIMD klijent + consent) ne može da se dobije u CI
// stack-u, pa tools/list, tools/call, scope-ovi i origin nisu ovde pokriveni.

import { request } from '@playwright/test';
import { expect, test } from '../fixtures/auth';
import { ApiClient, createActivatedUser } from '../fixtures/api';
import { env } from '../env';

const PRM_PATH_RE = /\/api\/\.well-known\/oauth-protected-resource/;

const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'e2e', version: '1.0.0' },
  },
};

const mcpHeaders = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

function expectChallenge(header: string | undefined): void {
  expect(header, 'WWW-Authenticate zaglavlje').toBeDefined();
  expect(header).toMatch(/^Bearer /);
  const metadata = /resource_metadata="([^"]+)"/.exec(header ?? '')?.[1];
  expect(metadata, 'resource_metadata u WWW-Authenticate').toMatch(PRM_PATH_RE);
  expect(header).toContain('scope="reservations:read reservations:write"');
}

test.describe('MCP server: autorizacija i PRM', () => {
  test('@smoke bez tokena /mcp vraća 401 sa resource_metadata', async () => {
    const http = await request.newContext();
    try {
      const response = await http.post(`${env.apiUrl}/mcp`, { headers: mcpHeaders, data: initializeBody });
      expect(response.status()).toBe(401);
      expectChallenge(response.headers()['www-authenticate']);
    } finally {
      await http.dispose();
    }
  });

  test('@smoke nevažeći token na /mcp vraća 401 sa resource_metadata', async () => {
    const http = await request.newContext();
    try {
      const response = await http.post(`${env.apiUrl}/mcp`, {
        headers: { ...mcpHeaders, Authorization: 'Bearer nije.pravi.token' },
        data: initializeBody,
      });
      expect(response.status()).toBe(401);
      expectChallenge(response.headers()['www-authenticate']);
    } finally {
      await http.dispose();
    }
  });

  test('@smoke PRM vraća polja iz RFC 9728 na oba puta', async () => {
    const http = await request.newContext();
    try {
      for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']) {
        const response = await http.get(`${env.apiUrl}${path}`);
        expect(response.status(), path).toBe(200);
        const body = (await response.json()) as {
          resource: string;
          authorization_servers: string[];
          scopes_supported: string[];
          bearer_methods_supported: string[];
        };
        expect(body.resource, path).toMatch(/\/api\/mcp$/);
        expect(body.authorization_servers.length, path).toBeGreaterThan(0);
        expect([...body.scopes_supported].sort(), path).toEqual(['reservations:read', 'reservations:write']);
        expect(body.bearer_methods_supported, path).toEqual(['header']);
      }
    } finally {
      await http.dispose();
    }
  });

  test('REST token (aud REST API-ja) ne prolazi na /mcp', async () => {
    const user = await createActivatedUser();
    const api = await ApiClient.as(user);
    try {
      // Isti REST token koji radi na REST-u ne sme da radi na /mcp.
      const rest = await api.get('/reservations');
      expect(rest.ok(), `REST sa REST tokenom: HTTP ${rest.status()}`).toBe(true);

      const response = await api.post('/mcp', { headers: mcpHeaders, data: initializeBody });
      expect(response.status()).toBe(401);
      expectChallenge(response.headers()['www-authenticate']);
    } finally {
      await api.dispose();
    }
  });
});
