# FE brief — ticket #242: public API and public OpenAPI spec

**No FE work is required.** No endpoint changed its method, path, request/response body, status codes or authorization.
`@PublicApi` and the springdoc groups only change what the generated OpenAPI documentation contains.

## What changed (for information)
- New springdoc group `public` (only `@PublicApi` operations) in both services; group `internal` (everything) only on the `local`/`dev` profiles.
- Spec URLs: `/api/v3/api-docs/public` (resource-service), `/auth/v3/api-docs/public` (auth-service). On non-`local`/`dev` profiles the spec without a group and `/internal` are denied.
- FE, E2E tests and generated clients must not rely on `/v3/api-docs` (none do today); on staging it is no longer served.

## Suggested FE feature / command
None.
