# FE Feature Implementation Workflow

Companion to the root `CLAUDE.md` and the per-module `modules/*/CLAUDE.md`.
The module file tells you what belongs in your layer; this file tells you how to
behave when the ticket does not answer a question.

## Module Map

| Layer | Source root | Alias | Public API |
|---|---|---|---|
| domain | `modules/domain/src/` | `@domain` | `modules/domain/src/index.ts` |
| application | `modules/application/src/` | `@application` | `modules/application/src/index.ts` |
| infrastructure | `modules/infrastructure/src/` | `@infrastructure` | `modules/infrastructure/src/index.ts` |
| ui | `modules/ui/src/` | `@ui` | `modules/ui/src/index.ts` |

**Dependency flow:** `ui → application → domain ← infrastructure`

---

## Headless Session Rules

These apply to every headless (`-p`) session. They are non-negotiable.

1. **Read domain first.** Before writing anything in your layer, read
   `modules/domain/src/index.ts` and the entities, errors, repository
   interfaces and use case interfaces it exports. That is the contract you
   implement against.

2. **Stay in your module.** Write only under `modules/<your-layer>/`. If your
   layer needs something that does not exist in `@domain`, that is a missing
   prerequisite, not your job to add. Stop and return `needs_input`.

3. **No placeholders.** Every file must typecheck. Never write
   `throw new Error('not implemented')`, `// TODO`, or `as any` to get past a
   type error.

4. **Conservative-choice rule.** When a decision needs business knowledge you
   cannot infer from the code or the ticket, make the safest conventional
   choice from the table for your layer and emit a single-line warning:
   ```ts
   // WARNING: assumed optional field — verify against BE contract before merging
   ```

5. **Export or it does not exist.** Anything another module needs must be
   re-exported from your module's `src/index.ts`.

6. **Never use deep import paths.** `import { Business } from '@domain'`, never
   `from '@domain/entities/Business'`.

7. **Forbidden imports are absolute.** If a file seems to require a forbidden
   import, the boundary is wrong — emit a WARNING and implement without it.

8. **After writing all files**, run the pre-exit checklist for your layer.

---

## DOMAIN LAYER

Rules: `modules/domain/CLAUDE.md`

### What to create

Entities and value objects in `src/entities/`, error types in `src/errors/`,
repository interfaces in `src/repositories/`, use case interfaces in
`src/use-cases/`, shared primitives in `src/types/`. Everything re-exported
from `src/index.ts`.

### Source of truth

When the ticket comes from a BE fe-brief, the brief wins. Field names,
optionality and enum members must match the BE response DTO exactly. A
mismatch between the brief and an existing domain type is not something to
reconcile silently — return `needs_input`.

### Conservative-choice rules

| Situation | Choice |
|---|---|
| Unsure whether a field can be absent | Mark it optional (`field?: T`) and warn |
| Unsure of an id type | `string` (BE uses UUID) |
| Unsure of a date type | `string` in ISO-8601, converted at the UI edge |
| Unsure whether to extend an entity or add a new one | New entity; do not widen an existing one |
| Unsure whether something is a domain error | Add an error type; the UI can always ignore it |
| BE brief has a field the domain lacks | Add it; never drop a field the API returns |

### Pre-exit checklist (domain)

- [ ] Zero imports: no React, no axios/fetch, no browser APIs, no `@` aliases
- [ ] Every new type is exported from `src/index.ts`
- [ ] Types match the BE brief field-for-field, including optionality
- [ ] Repository interfaces are named in domain language, not persistence language
- [ ] No implementation bodies — interfaces and plain data only
- [ ] `yarn lint` passes

---

## APPLICATION LAYER

Rules: `modules/application/CLAUDE.md`

### What to create

`*UseCaseImpl` classes in `src/use-cases/<domain>/`, implementing use case
interfaces from `@domain` and receiving repository interfaces through the
constructor. Unit tests in `src/use-cases/__tests__/`.

### Tests

Vitest. Mock the repository **interface**, construct the use case directly, and
assert on the returned value plus the repository call. Do not mock concrete
implementations, and do not reach for the DOM.

```ts
const repo: BusinessRepository = { getBusiness: vi.fn().mockResolvedValue(business) } as unknown as BusinessRepository;
const useCase = new GetBusinessUseCaseImpl(repo);
```

### Conservative-choice rules

| Situation | Choice |
|---|---|
| Unsure whether to validate input here | Validate only what the domain already declares; do not invent rules |
| Repository rejects | Let the error propagate; do not swallow it |
| Unsure whether to add a method to an existing use case | New use case class — one use case does one thing |
| Unsure of ordering or filtering | Return what the repository returns, unsorted, and warn |
| Need a value from the environment | Not here; it belongs in infrastructure |

### Pre-exit checklist (application)

- [ ] Imports only from `@domain`, through the index
- [ ] No React, no axios/fetch, no browser APIs, no `@infrastructure` or `@ui`
- [ ] Repositories arrive via constructor, never imported concretely
- [ ] Every new use case has a test that covers success and the failure path
- [ ] Every new class is exported from `src/index.ts`
- [ ] `yarn test` and `yarn lint` pass

---

## INFRASTRUCTURE LAYER

Rules: `modules/infrastructure/CLAUDE.md`

### What to create

`*ApiRepository` classes in `src/repositories/` implementing domain repository
interfaces. Reuse the existing axios clients in `src/api/` — `authAxiosClient`
for unauthenticated calls, `resourceAxiosClient` for authenticated ones.

### Environment variables

`import.meta.env` is read only in `src/config/environment.ts`. A new `VITE_`
variable is added there and to `.env.example`, and nowhere else.

### Errors

Every axios failure goes through `normalizeAxiosError` in `src/api/apiError.ts`.
Adapters translate, they do not decide.

### Conservative-choice rules

| Situation | Choice |
|---|---|
| Unsure of the HTTP path | Follow the fe-brief exactly; if silent, mirror the sibling repository's pattern |
| Unsure whether a call needs auth | Use `resourceAxiosClient` (authenticated) and warn |
| Unsure how to send a list filter | Query parameters for `GET`, request body for `POST` |
| BE returns a field the domain type lacks | Ignore it in the mapper; do not widen the domain type from here |
| Unsure which domain error a status maps to | 404 → not-found error, 4xx → validation error, 5xx → generic; warn |
| Tempted to add a public helper method | Do not — the interface from `@domain` is the whole public surface |

### Pre-exit checklist (infrastructure)

- [ ] Every method of the implemented interface exists, with no extras
- [ ] No new axios instance unless the ticket asked for one
- [ ] All error handling goes through `normalizeAxiosError`
- [ ] No `import.meta.env` outside `config/environment.ts`
- [ ] New `VITE_` variables added to `.env.example`
- [ ] No React, no `@ui`, no business decisions
- [ ] Every new class is exported from `src/index.ts`
- [ ] `yarn lint` passes

---

## UI LAYER

Rules: `modules/ui/CLAUDE.md`

### What to create

Components in `src/components/`, pages in `src/pages/`, hooks in `src/hooks/`,
routes in `src/routes/`, presentation state in `src/state/`.

### Composition root

`src/app/container/index.ts` is the only file in this module allowed to import
`@infrastructure`. Everything else imports wired instances from
`../app/container`. If a feature needs a new use case instance, add it to the
container and consume it from there. This rule has no exceptions.

### Conservative-choice rules

| Situation | Choice |
|---|---|
| Unsure how to fetch | `useQuery` for reads, `useMutation` for writes, both in a hook under `src/hooks/` |
| Unsure about layout or styling | Copy the closest existing component; do not introduce a new pattern |
| Unsure what to show while loading | Render the existing loading treatment used by the sibling page |
| Unsure what to show on error | Render the normalized error message through i18next; never a raw axios message |
| Unsure what to show when empty | An i18n empty-state message, not a blank region |
| Need a new user-visible string | Add an i18n key; never inline the text in JSX |
| Tempted to add validation in a component | It belongs in domain or application; warn and call the use case |
| Need a route guard | Use `useAuthStore`; never call the auth API from a component |

### Pre-exit checklist (ui)

- [ ] No `@infrastructure` import outside `app/container/index.ts`
- [ ] No axios/fetch anywhere in this module
- [ ] No business logic or validation inside components
- [ ] Async state goes through react-query in a hook, not inline in a component
- [ ] Every user-visible string has an i18n key
- [ ] Domain types imported from `@domain`, not redeclared locally
- [ ] New routes registered in `src/routes/`
- [ ] `yarn test` and `yarn lint` pass

---

## Cross-Layer Violation Examples

```ts
// WRONG — application reaching for HTTP
import axios from 'axios';                        // in modules/application

// WRONG — deep import bypassing the module index
import { Business } from '@domain/entities/Business';

// WRONG — a component importing infrastructure directly
import { businessApiRepository } from '@infrastructure';  // in a page component

// RIGHT — the component takes the wired instance from the composition root
import { getBusinessUseCase } from '../../app/container';
```

---

## Global Warning Comment Format

```ts
// WARNING: <reason> — verify before merging
```

Use it for: assumed optionality, assumed HTTP path or auth requirement, assumed
status-to-error mapping, assumed business rule, assumed empty/loading
treatment. One line only; do not write paragraph comments.
