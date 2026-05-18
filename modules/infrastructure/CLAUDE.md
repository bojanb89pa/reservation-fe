# Infrastructure Module

## Isolated context instructions

When working inside this module:
- Read ONLY this CLAUDE.md
- Do NOT read CLAUDE.md files from other modules
- Do NOT modify files outside `modules/infrastructure/` unless explicitly requested
- Do NOT infer rules from sibling modules

---

## Purpose

This module contains all technical implementations — HTTP clients, repository adapters, external integrations, and environment configuration. It implements contracts defined in the domain.

## Allowed

- Repository implementations (classes that implement domain repository interfaces)
- HTTP/Axios client setup and interceptors
- Token storage and session persistence
- Environment configuration (`import.meta.env` access)
- External service adapters
- Error normalization helpers

## May depend on

- `@domain` — repository interfaces and domain types to implement against
- `@application` — (available but currently unused; reserved for application-level contracts)

## Forbidden

- React components or hooks
- UI business logic or presentation state
- Direct business decisions (routing, validation logic that belongs in domain)
- Imports from `@ui`

## Dependency rule

This module may only import from `@domain` and `@application`. The `references` array in tsconfig.json points only to `../domain` and `../application`.

All cross-module imports must go through the module index: `@domain`, `@application`. Never use deep paths.

## Public API

All exports must go through `src/index.ts`. This includes: axios clients, repository implementations, `env`, and `tokenStorage`. The UI composition root imports everything it needs from `@infrastructure`.

## File structure

```
src/
  api/
    apiError.ts           — error normalization
    authAxiosClient.ts    — unauthenticated HTTP client
    resourceAxiosClient.ts — authenticated HTTP client with token interceptor
    tokenStorage.ts       — localStorage token persistence
  config/
    environment.ts        — VITE_ env var access (single source of truth)
  repositories/
    *ApiRepository.ts     — domain repository interface implementations
  index.ts                — public API, all exports
```

## Rules

- Repository implementations must satisfy the interface defined in `@domain` — no extra public methods beyond the interface (except narrow exceptions like `AuthApiRepository.exchangeCode` for the OAuth flow)
- No business decisions inside adapters — they translate, not decide
- `environment.ts` is the single place where `import.meta.env` is accessed
- All axios error handling goes through `normalizeAxiosError` in `apiError.ts`
