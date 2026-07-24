# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY . .

ARG VITE_AUTH_BASE_URL
ARG VITE_RESOURCE_BASE_URL
ARG VITE_OAUTH_CLIENT_ID
ARG VITE_OAUTH_CLIENT_SECRET
ARG VITE_OAUTH_REDIRECT_URI
ENV VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL \
    VITE_RESOURCE_BASE_URL=$VITE_RESOURCE_BASE_URL \
    VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID \
    VITE_OAUTH_CLIENT_SECRET=$VITE_OAUTH_CLIENT_SECRET \
    VITE_OAUTH_REDIRECT_URI=$VITE_OAUTH_REDIRECT_URI

RUN yarn build

FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
