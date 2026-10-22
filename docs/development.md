# Development

This page covers local setup for the three apps and the shared packages.

## Requirements

- Node 22 (CI and the Docker images use Node 22).
- Yarn 1 (classic). The Docker builds enable it with `corepack enable`.

## Install

```bash
yarn install --frozen-lockfile
```

One install at the root covers every workspace: the four `modules/*` packages, the three `apps/*` and `e2e`.
There is one `yarn.lock`.

## Environment variables

### Root `.env` (`apps/web`, `apps/widget`)

Copy `.env.example` to `.env` in the repository root. Vite reads it from there for the web app and the widget.

| Variable                   | Used by               | Meaning                                                                                                                        |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `BASE_DOMAIN`              | `compose.yaml`        | Domain for the Traefik host rules. Not used by Vite.                                                                           |
| `VITE_AUTH_BASE_URL`       | web, widget           | Auth service base URL, including `/auth`.                                                                                      |
| `VITE_RESOURCE_BASE_URL`   | web, widget           | Resource service base URL, including `/api`.                                                                                   |
| `VITE_OAUTH_CLIENT_ID`     | web, widget           | OAuth client ID.                                                                                                               |
| `VITE_OAUTH_CLIENT_SECRET` | web, widget           | OAuth client secret.                                                                                                           |
| `VITE_OAUTH_REDIRECT_URI`  | web, widget           | Callback URL, for example `http://localhost:5173/callback`.                                                                    |
| `VITE_LEGAL_CONTACT_EMAIL` | web                   | Contact address on the `/privacy` and `/terms` pages. Optional.                                                                |
| `WIDGET_FRAME_ANCESTORS`   | `vite preview`, nginx | Space-separated origins allowed to embed `/widget/`. Runtime only. It is not a `VITE_` variable and does not enter the bundle. |

Every `VITE_` variable is baked into the JavaScript bundle at build time. After you change one, restart the dev
server, or rebuild for `preview` and production.

### `apps/demo-partner/.env.local`

Copy `apps/demo-partner/.env.example` to `apps/demo-partner/.env.local`.

| Variable                           | Meaning                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `VITE_RESERVA_ORIGIN`              | Origin that serves `/widget.js`, without a trailing slash.           |
| `VITE_DEMO_CLIENT_ID`              | Public client application ID of the demo partner.                    |
| `VITE_DEMO_LOCATION_ID`            | Location with business consent.                                      |
| `VITE_DEMO_NO_CONSENT_LOCATION_ID` | Location without consent. Shows the fallback contact.                |
| `VITE_GOOGLE_CLIENT_ID`            | Google OAuth Web client ID (a public value).                         |
| `VITE_DEMO_IDENTITY`               | `test` for the test identity used by E2E. Leave empty to use Google. |

## Dev servers

| Command                         | URL                           | Notes                                                                                                                                                                                               |
| ------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn dev`                      | http://localhost:5173         | Reserva web app (`apps/web`).                                                                                                                                                                       |
| `yarn workspace @fe/widget dev` | http://localhost:5174/widget/ | Widget iframe app, with `base: '/widget/'`. Pass `clientId` and `locationId` as query parameters. The loader `widget.js` exists only in a build, so to test the loader use the build and `preview`. |
| `yarn dev:demo-partner`         | http://localhost:5175         | Demo partner site. Needs `VITE_RESERVA_ORIGIN` pointing at a running Reserva origin.                                                                                                                |

Serve the full build, including `/widget/` and `/widget.js`, with:

```bash
yarn build
yarn preview                  # apps/web/dist, default port 4173
```

The `preview` server sends `frame-ancestors` for `/widget/` from `WIDGET_FRAME_ANCESTORS` (the default list
includes `http://localhost:5175`), so the demo partner can embed it.

## Scripts

Run from the repository root.

| Command                   | What it does                                                   |
| ------------------------- | -------------------------------------------------------------- |
| `yarn build`              | `tsc -b`, then `apps/web` and `apps/widget` production builds. |
| `yarn build:demo-partner` | Production build of the demo partner site.                     |
| `yarn preview`            | Serves the `apps/web` build.                                   |
| `yarn typecheck`          | `tsc -b` for the TypeScript project references.                |
| `yarn lint`               | ESLint, with zero warnings allowed.                            |
| `yarn format`             | Prettier, writes the files.                                    |
| `yarn test`               | Vitest in watch mode.                                          |
| `yarn test --run`         | Vitest, single run. Use this in scripts and CI.                |
| `yarn test:coverage`      | Vitest with coverage.                                          |
| `yarn test:ui`            | Vitest UI.                                                     |

To run one test file: `yarn test --run modules/ui/src/components/widget/__tests__/WidgetApp.test.tsx`.

## Working in the packages

- Import across packages only through each package's index (`@fe/domain`, `@fe/application`, and so on). A
  package exports only what its `src/index.ts` exports.
- The layer rules are enforced by ESLint. See [architecture.md](architecture.md).
- The demo partner imports no `@fe/*` package, by design.
