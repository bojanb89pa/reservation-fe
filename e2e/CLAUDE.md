# E2E (Playwright)

End-to-end tests for the whole stack: FE + auth-service + resource-service +
Postgres + Mailpit. Separate `package.json` and `yarn.lock`; not part of the
root `yarn lint`/`yarn test`/`tsc -b`.

## Where tests run

- **CI only** — `.github/workflows/e2e.yml` on a GitHub-hosted runner, against
  a fresh stack from `compose.e2e.yml`. Triggered by PRs to `main`, PRs that
  touch `e2e/**`, and manually.
- **Never start the stack or a browser on the home server (Raspberry Pi).**
  Locally only run:
  - `yarn --cwd e2e install --frozen-lockfile` (if `e2e/node_modules` is missing)
  - `yarn --cwd e2e typecheck`
  - `yarn --cwd e2e test:list`

## Layout

```
e2e/
  env.ts               URLs and credentials (env vars with CI defaults)
  playwright.config.ts
  fixtures/
    auth.ts            `test`/`expect` with fixtures; browser login via real OAuth
    api.ts             API client with a real OAuth token; user factory
    mailpit.ts         activation e-mails from Mailpit
  specs/               *.spec.ts
```

## Rules for every test

- Import `test` and `expect` from `../fixtures/auth`, not from `@playwright/test`.
- **Each test prepares its own data** through `ApiClient` / `createActivatedUser`
  / the `user` fixture, with unique names (`uniqueEmail`, `uniqueName`). No test
  depends on another test, on execution order, or on demo seed data.
- **Selectors:** `getByRole` / `getByLabel` / `getByText`. `data-testid` only where
  role and name are not unique (repeated cards, time slots). The auth-service login
  page (`#username`, `#password`) is handled by `loginInBrowser` — don't repeat it.
- **No `waitForTimeout`.** Wait for a state: `expect(...).toBeVisible()`,
  `page.waitForURL(...)`, `expect.poll(...)`.
- **`@smoke` in the title = read-only.** Such a test may later run against staging,
  so it must not create, change or delete anything, and must not need Mailpit.
- **Never weaken a test to make it pass:** no `test.skip`, `test.fixme`,
  `.only`, loosened assertions or changed expectations. If the app behaves
  wrongly, that is the finding — report it.
- Admin actions use `adminCredentials()` (bootstrap admin
  `seed-admin@demo.reserva.test`), never a personal account.

## API client

```ts
const api = await ApiClient.as(user);           // resource-service, bearer token
const res = await api.post('/businesses', { data: {...} });
const res2 = await api.auth.get('users/...');   // auth-service (path without leading slash)
await api.dispose();
```

Request/response shapes come from the BE OpenAPI docs
(`/api/v3/api-docs`, `/auth/v3/api-docs`) and the FE domain types.

## Demo seed (staging)

`e2e/scripts/seed-demo.ts` fills a stack with demo content (24 businesses,
6 owners, ~10 users under `@demo.reserva.test`, a few future reservations per
business) through the same API endpoints tests use — no direct DB writes.
Content lives in `e2e/data/demo/*.json` (deterministic, committed). Idempotent
by natural key (account email, business name); it tops reservations up to a
per-business cap instead of duplicating them, and never deletes anything.

Run with `yarn --cwd e2e seed:demo`. Required env vars, on top of the usual
`E2E_AUTH_URL` / `E2E_API_URL` / `E2E_BASE_URL`:

```bash
SEED_ADMIN_EMAIL=seed-admin@demo.reserva.test   # bootstrap admin, never a personal account
SEED_ADMIN_PASSWORD=...
DEMO_PASSWORD=...                                # password for every demo owner/user account
```

`SEED_EXPECT_NOOP=1 yarn --cwd e2e seed:demo` exits with an error if the run
would create anything — used in CI right after a normal run, as an
idempotency check (never a full stack reset).

Against **staging**, run it manually — never from CI or an agent:

```bash
E2E_AUTH_URL=https://reserva.bojanlab.com/auth \
E2E_API_URL=https://reserva.bojanlab.com/api \
E2E_BASE_URL=https://reserva.bojanlab.com \
SEED_ADMIN_EMAIL=seed-admin@demo.reserva.test \
SEED_ADMIN_PASSWORD=... \
DEMO_PASSWORD=... \
yarn --cwd e2e seed:demo
```

The script compiles itself with `tsc` first (`scripts/tsconfig.build.json`)
because it reuses `fixtures/api.ts`, which needs a real TS-to-JS transform,
not just type-stripping.
