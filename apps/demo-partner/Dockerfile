# syntax=docker/dockerfile:1

# Build kontekst je koren repoa (workspace + yarn.lock):
#   docker build -f apps/demo-partner/Dockerfile .
# Build stage radi na native arhitekturi runnera ($BUILDPLATFORM): izlaz je statika, pa nema
# potrebe za Node-om pod QEMU-om. Samo runtime stage je ciljna arhitektura.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

# Prvo samo manifesti workspace-a, da se sloj sa zavisnostima kešira.
COPY package.json yarn.lock ./
COPY apps/web/package.json apps/web/
COPY apps/widget/package.json apps/widget/
COPY apps/demo-partner/package.json apps/demo-partner/
COPY modules/domain/package.json modules/domain/
COPY modules/application/package.json modules/application/
COPY modules/infrastructure/package.json modules/infrastructure/
COPY modules/ui/package.json modules/ui/
COPY e2e/package.json e2e/
RUN corepack enable && yarn install --frozen-lockfile

COPY apps/demo-partner apps/demo-partner

# VITE_* se ugrađuju u bundle pri build-u. VITE_DEMO_IDENTITY se NAMERNO ne prosleđuje:
# produkcijski image nikad nema test režim.
ARG VITE_RESERVA_ORIGIN
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_DEMO_CLIENT_ID
# Lokacija sa saglasnošću (isto kao u .env.example); nije tajna ni promenljiva po okruženju.
ARG VITE_DEMO_LOCATION_ID=bec8f7fe-acce-4f57-ae21-92cd64eb1b07
ARG VITE_DEMO_NO_CONSENT_LOCATION_ID
ENV VITE_RESERVA_ORIGIN=$VITE_RESERVA_ORIGIN \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_DEMO_CLIENT_ID=$VITE_DEMO_CLIENT_ID \
    VITE_DEMO_LOCATION_ID=$VITE_DEMO_LOCATION_ID \
    VITE_DEMO_NO_CONSENT_LOCATION_ID=$VITE_DEMO_NO_CONSENT_LOCATION_ID

RUN yarn workspace @fe/demo-partner build

FROM nginx:alpine AS runtime
COPY apps/demo-partner/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/demo-partner/dist /usr/share/nginx/html

EXPOSE 80
