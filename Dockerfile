# syntax=docker/dockerfile:1

# Build stage runs on the runner's native arch ($BUILDPLATFORM): the output is
# static files, so there's no need to run Node under QEMU (it hangs there).
# Only the runtime stage is the target arch, and it has no RUN steps.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

# Prvo samo manifesti workspace-a, da se sloj sa zavisnostima kešira dok se
# menja samo kod.
COPY package.json yarn.lock ./
COPY apps/web/package.json apps/web/
COPY apps/widget/package.json apps/widget/
COPY modules/domain/package.json modules/domain/
COPY modules/application/package.json modules/application/
COPY modules/infrastructure/package.json modules/infrastructure/
COPY modules/ui/package.json modules/ui/
COPY e2e/package.json e2e/
RUN corepack enable && yarn install --frozen-lockfile

COPY . .

ARG VITE_AUTH_BASE_URL
ARG VITE_RESOURCE_BASE_URL
ARG VITE_OAUTH_CLIENT_ID
ARG VITE_OAUTH_CLIENT_SECRET
ARG VITE_OAUTH_REDIRECT_URI
ARG VITE_LEGAL_CONTACT_EMAIL
ARG VITE_APP_SITE_URL
ENV VITE_LEGAL_CONTACT_EMAIL=$VITE_LEGAL_CONTACT_EMAIL \
    VITE_APP_SITE_URL=$VITE_APP_SITE_URL \
 VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL \
    VITE_RESOURCE_BASE_URL=$VITE_RESOURCE_BASE_URL \
    VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID \
    VITE_OAUTH_CLIENT_SECRET=$VITE_OAUTH_CLIENT_SECRET \
    VITE_OAUTH_REDIRECT_URI=$VITE_OAUTH_REDIRECT_URI

RUN yarn build

FROM nginx:alpine AS runtime

# Šablon: zvanični nginx image pri startu zameni ${WIDGET_FRAME_ANCESTORS} (envsubst) i
# upiše rezultat u conf.d/default.conf. Lista je runtime env, ne VITE_ (nije u bundle-u).
COPY nginx.conf /etc/nginx/templates/default.conf.template
# apps/web/dist sadrži i /widget/ (iframe aplikacija) i /widget.js (loader).
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
ENV WIDGET_FRAME_ANCESTORS="https://demo-business.bojanlab.com http://localhost:3000 http://localhost:5175 http://127.0.0.1:5175"

EXPOSE 80
