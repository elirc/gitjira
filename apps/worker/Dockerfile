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
# Same fix as the API image: run prisma via the api workspace script (npx prisma
# from /app fails — the binary is nested in apps/api/node_modules/.bin).
RUN npm run db:generate -w @gitjira/api
# Prune dev deps before the runtime copy (see the API image for the 1.8GB story).
RUN npm prune --omit=dev

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

# Non-root user (sprint 15 review): least privilege, same as the API image.
RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin app && chown -R app /app
USER app

# LEARN (sprint 15 review): the worker has no HTTP port, but the platform still
# needs a LIVENESS signal — "is this process actually working, or just running?"
# This checks the process can reach Redis (its one hard dependency); a worker
# that can't reach Redis is up-but-useless and should be restarted.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const {Redis}=require('ioredis');const r=new Redis({host:process.env.REDIS_HOST||'localhost',port:+(process.env.REDIS_PORT||6379),maxRetriesPerRequest:1,lazyConnect:true});r.connect().then(()=>r.ping()).then(()=>{r.quit();process.exit(0)}).catch(()=>process.exit(1))"

WORKDIR /app/apps/worker
CMD ["node", "src/index.js"]
