# FE brief — #283 MCP consents (connected AI applications)

Auth-service, context path `/auth`, goes through the gateway as usual. JWT required (any signed-in user). Not a public API endpoint. Users only ever see/revoke their own consents.

## Endpoints

### GET `/auth/users/me/mcp-consents`
- Response 200: `McpClientConsent[]` (empty array if none)

### DELETE `/auth/users/me/mcp-consents?clientId=<https url>`
- `clientId` is a URL: send it as a query param, URL-encoded (`encodeURIComponent`).
- 204 no body — consent deleted and the client's refresh/access tokens for this user are invalidated (client must sign in again).
- 404 `{ "message": ... }` — no consent for that client (`error.mcp.client_consent_not_found`); same answer if the consent belongs to someone else.
- 401 — not signed in.

## TypeScript

```ts
export interface McpClientConsent {
  clientId: string;      // https URL of the client's metadata document
  clientName: string;    // e.g. "Claude"
  clientHost: string;    // e.g. "claude.ai"
  scopes: string[];      // approved scopes, sorted
  grantedAt: string | null; // ISO-8601 instant
}
```

## Error codes
- `error.mcp.client_consent_not_found` (404) — consent missing/already revoked; refresh the list.

## Reservations (resource-service)
`ReservationResponse` already contains `origin: string` and `originClient: string | null` (name of the AI assistant, only when origin is AI_ASSISTANT). No BE change was needed.

## Suggested FE feature
`connected-ai-apps` — settings page listing consents with a "Disconnect" button (confirm dialog, DELETE, then refetch); show `originClient` badge on reservations booked by AI.

Suggested command: `./scripts/implement-feature.sh frontend connected-ai-apps`
