# Demo partner ("Beogradski Berberin")

A static Vite site for a fictional partner. It behaves like a real partner: it embeds the widget only
through the public loader `{VITE_RESERVA_ORIGIN}/widget.js` and the `window.ReservaWidget` queue, and
it imports no `@fe/*` package (ESLint enforces this). It is not part of the root `yarn build`.

It is the live example of the integration described in [partner-integration.md](../../docs/partner-integration.md).
The hosted copy runs at https://demo-business.bojanlab.com.

```bash
cp apps/demo-partner/.env.example apps/demo-partner/.env.local   # fill in VITE_DEMO_CLIENT_ID
yarn dev:demo-partner        # http://localhost:5175
yarn build:demo-partner      # yarn workspace @fe/demo-partner build → apps/demo-partner/dist
```

## Configuration (`.env.example`)

| Variable                           | Meaning                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `VITE_RESERVA_ORIGIN`              | Origin the `/widget.js` loader is loaded from                                 |
| `VITE_DEMO_CLIENT_ID`              | Public ID of the partner's client application                                 |
| `VITE_DEMO_LOCATION_ID`            | Location with business consent (the widget is shown on the right)             |
| `VITE_DEMO_NO_CONSENT_LOCATION_ID` | Location without consent; on `onUnavailable` the site shows a contact instead |
| `VITE_GOOGLE_CLIENT_ID`            | Google OAuth Web Client ID (public value)                                     |
| `VITE_DEMO_IDENTITY`               | `test` = test mode, empty = Google                                            |

## Sign-in

Google Identity Services, in the browser only: the ID token stays in memory (no cookies and no backend)
and is returned to the widget through `getIdentityToken`. `refreshIdentity` is called after every login
and logout.

## Test mode (`VITE_DEMO_IDENTITY=test`)

For E2E and local work only. Instead of the Google button (the "Sign in (test)" button), the ID token
comes from the test OIDC issuer (`e2e/oidc-issuer`). The first of these sources wins:

1. `window.__DEMO_ID_TOKEN__`. Playwright sets it before load (`page.addInitScript`), or later, and then
   calls `window.ReservaWidget.refreshIdentity()`.
2. The `?idToken=<jwt>` query parameter.

If a token is available at load time, the user is signed in from the start. "Sign out" clears it (the
widget receives `null`), and "Sign in (test)" takes the current token again.

This code (`src/testIdentity.ts`) is not in the production build: the branch guarded by
`import.meta.env.VITE_DEMO_IDENTITY === 'test'` in `src/identity.ts` is removed by dead-code elimination.
`src/__tests__/bundle.test.ts` builds the production bundle and checks that no test code is in it.

## Deploy

The site is at `https://demo-business.bojanlab.com`. The workflow `.github/workflows/deploy-demo-partner.yml`
runs on a push to `main` that changes `apps/demo-partner/**` (or the workflow itself), and manually
(`workflow_dispatch`):

1. A GitHub runner builds an arm64 image `ghcr.io/<owner>/reservation-demo-partner`
   (`apps/demo-partner/Dockerfile`; nginx serves the static files) and pushes it to GHCR.
2. A self-hosted runner on the Raspberry Pi host runs `git pull`, `docker compose pull demo-partner` and
   `docker compose up -d demo-partner`, then checks that the container returns `index.html`.

The Traefik route for `demo-business.<BASE_DOMAIN>` is in `compose.yaml` (service `demo-partner`, network
`web`). The widget may be embedded from this origin because `WIDGET_FRAME_ANCESTORS` on the Reserva
frontend lists it.

`VITE_*` values are baked into the bundle at build time, so a change needs a new build. The production
image never receives `VITE_DEMO_IDENTITY`, so it has no test mode.

### Repository variables (set by hand after the seed)

Settings → Secrets and variables → Actions → Variables:

| Variable                      | Value                                                                   |
| ----------------------------- | ----------------------------------------------------------------------- |
| `DEMO_CLIENT_ID`              | Public ID of the "Beogradski Berberin" client application from the seed |
| `DEMO_NO_CONSENT_LOCATION_ID` | ID of the location without business consent                             |

After you set them, run the workflow manually (Actions → Build & deploy (demo partner) → Run workflow).
`VITE_GOOGLE_CLIENT_ID` and `VITE_RESERVA_ORIGIN` are set in the workflow itself (public values), and
`VITE_DEMO_LOCATION_ID` has a default value in the Dockerfile.

### E2E

The `e2e` workflow builds the site with `VITE_DEMO_IDENTITY=test` and `VITE_RESERVA_ORIGIN=http://localhost:5173`,
serves it at `http://localhost:5175`, and exposes the URL as the `DEMO_PARTNER_URL` environment variable.
