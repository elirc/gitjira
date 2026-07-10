# 0018 — BullMQ + a worker process for background jobs

**Status:** accepted · **Sprint:** 09

## Context
Notification fan-out must happen off the request path (the assigner shouldn't wait). Options:
in-process async (fire-and-forget), a cron poller, or a real job queue.

## Decision
BullMQ (Redis-backed) with a separate `apps/worker` process. The API enqueues; the worker
consumes.

## Consequences
- ✅ The request path stays fast; slow/failable work is isolated and retryable.
- ✅ Workers scale independently of web servers.
- ✅ Retries, backoff, and a failed-set dead-letter queue come built in.
- ❌ A new moving part (Redis) and a second process to run and deploy.
- ❌ At-least-once delivery ⇒ handlers MUST be idempotent (see ADR 0019, and the planted bug).
