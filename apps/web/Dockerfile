# syntax=docker/dockerfile:1
# The web app is static files after `vite build` — build them, then serve them
# from nginx (tiny, fast, battle-tested). nginx also reverse-proxies /api and
# /socket.io to the API container, the prod equivalent of the dev-server proxy.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY apps/web ./apps/web
RUN npm run build -w @gitjira/web

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# nginx:alpine already runs worker processes as an unprivileged user.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/ >/dev/null 2>&1 || exit 1
