# FE brief — MCP authorization server (ticket #261)

## Summary
`auth-service` is now an OAuth authorization server for MCP clients (CIMD). No new JSON REST endpoints and no FE-consumed API changes; Reserva web login and partner token exchange are unchanged. The only user-facing piece is a server-rendered consent page.

## Endpoints created/modified
| Method | Path (with `/auth` context path) | Notes |
|---|---|---|
| GET | `/auth/oauth2/consent?client_id=&scope=&state=` | Thymeleaf consent screen (server-rendered, not JSON). Shown only for CIMD clients (`client_id` is an HTTPS URL). Requires logged-in session. Languages sr/en (`?lang=`, else `Accept-Language`), theme via `?theme=`/`theme` cookie. |
| POST | `/auth/oauth2/authorize` | Consent form submit (Spring Authorization Server). Allow = `client_id`, `state`, `scope`(s). Deny = `client_id`, `state` only → redirect with `error=access_denied`. |
| GET | `/auth/.well-known/openid-configuration`, `/auth/.well-known/oauth-authorization-server` | Now also publish `client_id_metadata_document_supported`, `none` auth method, `code_challenge_methods_supported=["S256"]`, `authorization_response_iss_parameter_supported`, scopes `reservations:read`, `reservations:write`. |

Request/response body: none (HTML form / redirects).

## TypeScript interfaces
No DTOs for the FE. Discovery additions (for reference):
```ts
interface AuthServerMetadataMcpFields {
  client_id_metadata_document_supported: true;
  token_endpoint_auth_methods_supported: string[]; // includes "none"
  code_challenge_methods_supported: ['S256'];
  authorization_response_iss_parameter_supported: true;
  scopes_supported: string[]; // includes 'reservations:read' | 'reservations:write'
}
```

## Error codes
- `invalid_target` — unknown/missing `resource` (required for CIMD clients), or a different `resource` on the token request.
- `access_denied` — user denied consent (redirected to client `redirect_uri` with `iss`).
- `invalid_request` / `invalid_client` — missing PKCE (`S256` required), unknown or invalid CIMD client.
- All authorization responses (success and error) carry `iss` (RFC 9207).

## FE feature suggestion
No FE work required now. Later (M4, out of scope): a "connected apps" screen to revoke consent.
Suggested command if wanted: `./scripts/implement-feature.sh frontend mcp-connected-apps`
