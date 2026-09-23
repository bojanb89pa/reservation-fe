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
