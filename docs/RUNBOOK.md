# Runbook

> It's 2am, you're on call, and you've never seen this system. Start here.

## System at a glance

- **web** (nginx serving the built React app, proxies /api + /socket.io) → **api**
  (Express + Socket.IO) → **Postgres** + **Redis**. **worker** (BullMQ) drains
  the notifications queue from Redis. See ARCHITECTURE.md.
- Health: `GET /api/health`. Metrics: `GET /metrics` (Prometheus).

## Deploy

- **Staging:** auto on push to `main` (deploy.yml → staging).
- **Prod:** push a `vX.Y.Z` tag → approve in the `production` GitHub Environment.
- Migrations run in the **release phase** (`[deploy] release_command` in
  fly.toml) — ONCE, before instances swap, NOT per instance (which would race
  with `min_machines_running = 2`). **If the release phase FAILS: the deploy
  aborts, no new instances start, and the OLD version keeps serving** — you are
  in a safe, known state. Read the release-command logs, fix the migration
  (fix-forward — see below), and re-deploy. Never hand-patch `_prisma_migrations`.

## Rollback

1. `flyctl releases --app gitjira-api` — find the last good version.
2. `flyctl deploy --image <previous-image>` (or `flyctl releases rollback`).
3. Verify `GET /api/health` and the error rate on the dashboard.
4. If the bad release included a migration, see **Migration failure** — rollback
   of code does NOT roll back the schema (that's why we use expand/contract).

- Measured drill time: **~90s** to previous version on staging (see the drill log).

## Migration failure

- The release phase failed → deploy aborted, old version serving. Safe.
- If a migration PARTIALLY applied: `prisma migrate status` to see state.
  Fix-forward with a corrective migration; do NOT hand-edit `_prisma_migrations`.
- Expand/contract (ADR 0031) means a code rollback is always compatible with the
  current schema — that's the whole point.

## Queue backlog (Redis / worker)

Symptom: notifications delayed; `bullmq` queue depth climbing.

1. Is Redis up? `redis-cli ping`. If down, restart it; the api degrades
   gracefully (enqueue fails are logged, requests still succeed).
2. Is the worker up and consuming? Check worker logs + the queue-depth gauge.
3. Backlog after recovery drains on its own (jobs are idempotent — replays are
   safe, sprint 9). If it doesn't drain, scale the worker.

## Secrets rotation

1. Set the new value in the platform secrets store (out of band).
2. `JWT_SECRET` rotation invalidates existing access tokens — users re-auth via
   the refresh cookie silently (short access-token TTL makes this a blip).
3. Redeploy so instances pick up the new env. Env validation fails the boot if a
   required secret is missing (fail fast).

## Incident template

Copy to `docs/postmortems/YYYY-MM-DD-title.md`:

- **Timeline** (UTC, what happened when)
- **Impact** (who/what, how long)
- **Root cause** (the actual mechanism, blameless)
- **Action items** (each → a real issue)
