# FE brief: MCP endpoints in the public OpenAPI document (#276)

No FE work required. Only the OpenAPI document of resource-service changed; endpoint behaviour is unchanged.

## Endpoints now documented in `/api/v3/api-docs/public`
- `POST /api/mcp` — MCP Streamable HTTP (JSON-RPC 2.0); bearer token with `reservations:read` / `reservations:write`; 401 carries `WWW-Authenticate`.
- `GET /api/.well-known/oauth-protected-resource` — anonymous, returns protected resource metadata.
- `GET /api/.well-known/oauth-protected-resource/mcp` — same document, `/mcp` suffixed URL.

## TypeScript
```ts
interface JsonRpcRequest { jsonrpc: '2.0'; id?: number | string; method: string; params?: Record<string, unknown>; }
interface JsonRpcResponse { jsonrpc: '2.0'; id?: number | string; result?: unknown; error?: unknown; }
```

## Errors
- `401` — missing/invalid token on `POST /mcp`.

## Suggested FE feature
None (`docs:skip`; docs covered by reservation-docs#11).
