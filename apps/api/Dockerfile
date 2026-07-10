# syntax=docker/dockerfile:1
# LEARN (sprint 15): a MULTI-STAGE build. The `build` stage has the full
# toolchain (dev deps, Prisma CLI) to install and generate the client; the
# `runtime` stage copies only what's needed to RUN. The dev toolchain never
# ships, so the image is smaller and its attack surface is tiny.

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
# Prisma needs openssl to generate/run its engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy manifests first so `npm ci` is cached until dependencies actually change
# (Docker layer caching — the biggest build-speed win in a Node image).
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

# Now the source, then generate the Prisma client.
COPY apps/api ./apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

# ---- runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

# Copy installed deps + app from the build stage. No dev toolchain comes along.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/apps/api
CMD ["node", "src/server.js"]
