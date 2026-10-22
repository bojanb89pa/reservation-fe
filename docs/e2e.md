# End-to-end tests

The E2E suite is [Playwright](https://playwright.dev) and lives in `e2e/` (workspace `@fe/e2e`). It drives the real
web app, the widget and the demo partner site against the real backend services.

## What runs where

| Where                               | What                           | How                                                                                                                           |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions, `e2e.yml`           | Full suite                     | On pull requests to `main`, on pull requests that change `e2e/**`, `compose.e2e.yml` or the workflow, and on manual dispatch. |
| GitHub Actions, `e2e.yml` (nightly) | `@smoke` tests against staging | Read-only (`E2E_READ_ONLY=1`). Uses only the demo account and never creates data.                                             |
| Locally                             | Type-check and list            | `yarn --cwd e2e typecheck` and `yarn --cwd e2e test:list`.                                                                    |

The full suite is designed to run in CI. The CI job starts the stack, serves the built sites, seeds the demo data and
then runs Playwright. Reproducing that locally is possible, but it needs the same stack and host entries as the workflow.

## The stack (`compose.e2e.yml`)

The compose file is ephemeral and holds no secrets. It starts:

- `auth-postgres` and `auth-service` (port 8081, path `/auth`),
- `resource-postgres` and `resource-service` (port 8080, path `/api`),
- `oidc-issuer`, a static test OIDC issuer (port 8090) whose keys are generated in CI by `e2e/oidc-issuer/generate-keys.mjs`,
- `mailpit`, which catches activation emails (HTTP API on port 8025).

The browser and the backend both have to see `auth-service` under the same name, because it is the token issuer.
CI adds `127.0.0.1 auth-service` and `127.0.0.1 oidc-issuer` to `/etc/hosts`.

The web app and the demo partner run on the host, not in compose: `yarn preview --port 5173` and
`yarn workspace @fe/demo-partner preview --port 5175`.

## Demo seed

`yarn --cwd e2e seed:demo` creates the demo businesses, locations and accounts (`e2e/data/demo/`). CI runs it twice:
the second run must be a no-op (`SEED_EXPECT_NOOP=1`), which checks that the seed is idempotent. The tests do not
depend on the seed. Each test creates its own data with unique names.

## Projects

Defined in `e2e/playwright.config.ts`:

| Project    | Matches                                                        | Notes                                                                                                                                             |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chromium` | everything except `responsive/**` and `widget-booking.spec.ts` | Desktop Chrome.                                                                                                                                   |
| `widget`   | `widget-booking.spec.ts`                                       | Chromium with the Local Network Access flags turned off. The widget host page is served from a fake public origin, and Chromium would block that. |
| `mobile`   | `responsive/**`                                                | Desktop Chrome at 390 × 844 with touch.                                                                                                           |

Other settings: `fullyParallel`, 2 workers in CI, one retry in CI, a 60 s test timeout, and a trace, a video and a
screenshot kept only for failures (or first retries).

## Environment variables

All of them are read in `e2e/env.ts`. The defaults match `compose.e2e.yml` and the local `yarn preview` setup.

| Variable                                                                   | Default                                                       | Meaning                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `E2E_BASE_URL`                                                             | `http://localhost:5173`                                       | The web app.                                                                 |
| `E2E_AUTH_URL`                                                             | `http://auth-service:8081/auth`                               | Auth service.                                                                |
| `E2E_API_URL`                                                              | `http://localhost:8080/api`                                   | Resource service.                                                            |
| `E2E_MAILPIT_URL`                                                          | `http://localhost:8025`                                       | Mail catcher API. Not present on staging.                                    |
| `E2E_OIDC_ISSUER`                                                          | `http://oidc-issuer:8090`                                     | Test OIDC issuer. Not present on staging.                                    |
| `E2E_OAUTH_CLIENT_ID`, `E2E_OAUTH_CLIENT_SECRET`, `E2E_OAUTH_REDIRECT_URI` | `reservation`, `e2e-secret`, `http://localhost:5173/callback` | OAuth client of the web app.                                                 |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`                                    | `seed-admin@demo.reserva.test`, empty                         | Admin account from the bootstrap. Never a personal admin.                    |
| `E2E_USER_PASSWORD`                                                        | `E2e-Passw0rd!`                                               | Password for accounts that the tests create.                                 |
| `E2E_DEMO_EMAIL`, `E2E_DEMO_PASSWORD`                                      | `user-1@demo.reserva.test`, `E2e-Demo-Passw0rd!`              | The one existing account that `@smoke` tests may sign in with.               |
| `E2E_READ_ONLY`                                                            | empty                                                         | `1` makes the API helpers refuse every write. Used by the nightly smoke run. |
| `CI`                                                                       | empty                                                         | Set by CI. It changes workers, retries and reporter.                         |

## Running a single spec

```bash
yarn --cwd e2e test -- specs/public/pregled-kategorija-i-biznisa.spec.ts   # needs the stack
yarn --cwd e2e test -- --grep @smoke --project=chromium                     # smoke subset
```

Specs are grouped by area under `e2e/specs/` (for example `public/`, `dashboard/`, `nalog/`, `bezbednost/`).

## Conventions

- Find elements by role and accessible name (`getByRole`, `getByLabel`). Add a `data-testid` only where the role and
  name are not unique, such as repeated cards or slots.
- Each test creates its own data with unique names, so tests can run in parallel.
- Tests tagged `@smoke` must be safe to run against staging with `E2E_READ_ONLY=1`.
