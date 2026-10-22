# Deployment

Two sites are deployed from this repository: the Reserva web app (with the widget) and the demo partner site.
Both are static builds served by nginx in a Docker image. A self-hosted runner on a Raspberry Pi host pulls the
image and restarts the container with Docker Compose. Traefik routes the public hostnames.

| Site                       | Hostname                      | Image                                      | Workflow                                    | Dockerfile                     |
| -------------------------- | ----------------------------- | ------------------------------------------ | ------------------------------------------- | ------------------------------ |
| Reserva web app and widget | `reserva.<BASE_DOMAIN>`       | `ghcr.io/<owner>/reservation-fe`           | `.github/workflows/deploy-staging.yml`      | `Dockerfile` (repository root) |
| Demo partner               | `demo-business.<BASE_DOMAIN>` | `ghcr.io/<owner>/reservation-demo-partner` | `.github/workflows/deploy-demo-partner.yml` | `apps/demo-partner/Dockerfile` |

`<BASE_DOMAIN>` is the `BASE_DOMAIN` value from `.env`. `<owner>` is the GitHub owner of the repository.

## Reserva web app and widget (staging)

Trigger: a push to `main`, or a manual run (`workflow_dispatch`).

1. **build-and-push** (GitHub-hosted runner): builds `linux/arm64` from the root `Dockerfile`. The build arguments
   come from repository variables and secrets: `VITE_AUTH_BASE_URL`, `VITE_RESOURCE_BASE_URL`, `VITE_OAUTH_CLIENT_ID`,
   `VITE_OAUTH_REDIRECT_URI` and the secret `VITE_OAUTH_CLIENT_SECRET`. The image is tagged `latest` and the commit SHA,
   and pushed to GHCR.
2. **deploy** (self-hosted runner with the `raspberry-pi` label, on the host):
   - `git pull --ff-only` in the deployment directory, so the compose file is current,
   - `docker compose pull reserva-fe`, then `docker compose up -d`,
   - a health check: `wget` inside the `reserva_fe` container must return an HTML page within 90 s,
   - a notification to the ntfy topic in `NTFY_TOPIC_URL`, if it is set.

The image has no published host port. It is reachable only through the `web` Docker network, which Traefik uses.

### What is in the image

The Dockerfile builds the web app, and the widget build writes `/widget/` and `/widget.js` into the same output.
nginx serves that output, with these headers:

- `/` and the rest of the app: `Content-Security-Policy: frame-ancestors 'self'`, so only the Reserva origin itself
  can frame it.
- `/widget/`: `frame-ancestors` takes the list from `WIDGET_FRAME_ANCESTORS`. The image sets a default in the
  Dockerfile, and `compose.yaml` can override it.
- `/widget.js`: a 5-minute cache, because the name is a public contract and has no hash.
- Static files (JS, CSS, images, fonts, and `/widget/assets/`): `public, immutable`, cached for 30 days.

The Dockerfile copies `nginx.conf` into `/etc/nginx/templates/`. The official nginx image substitutes
`${WIDGET_FRAME_ANCESTORS}` at container start.

## Demo partner (`demo-business`)

Trigger: a push to `main` that changes `apps/demo-partner/**` or the deploy workflow, or a manual run.

1. **build-and-push**: builds `linux/arm64` from `apps/demo-partner/Dockerfile`. The build context is the repository
   root, because the Dockerfile needs the workspace manifests. The `VITE_*` values are build arguments:
   `VITE_RESERVA_ORIGIN` (`https://reserva.<BASE_DOMAIN>`), `VITE_GOOGLE_CLIENT_ID`, and the repository variables
   `DEMO_CLIENT_ID` and `DEMO_NO_CONSENT_LOCATION_ID`. The Dockerfile sets `VITE_DEMO_LOCATION_ID` to a default.
2. **deploy**: pulls and restarts only the `demo-partner` service, then runs the same health check against
   `reserva_demo_partner`.

`VITE_DEMO_IDENTITY` is never passed, so the production image has no test identity mode.

After the first deploy, or after the seed changes the IDs, set the repository variables `DEMO_CLIENT_ID` and
`DEMO_NO_CONSENT_LOCATION_ID` and run the workflow again. Values that are baked into the bundle take effect only after a rebuild.

## Compose file

`compose.yaml` defines both services on the external `web` network, with Traefik labels for the hostnames,
`mem_limit` values of 128 MB (web) and 64 MB (demo partner), and `restart: unless-stopped`.

| Variable                                    | Used by              | Where it is set                             |
| ------------------------------------------- | -------------------- | ------------------------------------------- |
| `BASE_DOMAIN`                               | Traefik host rules   | `.env` on the host                          |
| `GHCR_OWNER`, `IMAGE_TAG`, `DEMO_IMAGE_TAG` | image names and tags | `.env` (optional, defaults in the file)     |
| `VITE_*` (web)                              | build arguments      | `.env`, read at `docker compose build` time |
| `WIDGET_FRAME_ANCESTORS`                    | runtime, nginx       | `compose.yaml` default, or `.env`           |

## Building an image locally

```bash
docker build -t reservation-fe \
  --build-arg VITE_AUTH_BASE_URL=... \
  --build-arg VITE_RESOURCE_BASE_URL=... \
  --build-arg VITE_OAUTH_CLIENT_ID=... \
  --build-arg VITE_OAUTH_CLIENT_SECRET=... \
  --build-arg VITE_OAUTH_REDIRECT_URI=... \
  .

docker build -f apps/demo-partner/Dockerfile -t reservation-demo-partner \
  --build-arg VITE_RESERVA_ORIGIN=... \
  --build-arg VITE_DEMO_CLIENT_ID=... \
  .
```

Run the image with `-e WIDGET_FRAME_ANCESTORS=...` to change the origins that may embed the widget.

## Operator checklist for self-hosting

- Set `WIDGET_FRAME_ANCESTORS` to the exact origins of the partner sites that embed the widget. Each entry is a
  full origin, such as `https://partner.example`. The default list covers only the demo.
- Register each partner's `allowed_origins` in Reserva too. An origin needs both: `frame-ancestors` here (enforced
  by the browser) and `allowed_origins` in the partner registration (enforced by the widget).
- Keep `VITE_*` values in sync between build and runtime. They are fixed at build time.
- The E2E stack (`compose.e2e.yml`) is never deployed. It is for CI only.
