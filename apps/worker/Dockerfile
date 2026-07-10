# syntax=docker/dockerfile:1
# Multi-stage build for the background worker (BullMQ). Same shape as the API
# image: build stage installs + generates, runtime stage runs only.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
# The worker imports the API's Prisma client + services, so it needs both.
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

# ---- runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/worker ./apps/worker
COPY --from=build /app/package.json ./package.json

WORKDIR /app/apps/worker
CMD ["node", "src/index.js"]
