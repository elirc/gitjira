# 0007 — One API error contract

**Status:** accepted · **Sprint:** 03

## Context

By sprint 03 the API had ad-hoc error shapes (`{ error: { message } }`, bare strings from
validation). Clients had nothing stable to branch on.

## Decision

Every error is `{ error: { code, message, details? } }`. `code` is a fixed enum
(`VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, …) — the machine contract. `message` is
human text and may change freely. A central `ApiError` class + `errorHandler` enforce it,
and the handler splits _expected_ domain errors (info log, shape returned) from
_unexpected_ ones (error log, opaque 500 in prod).

## Consequences

- ✅ Clients switch on `code`, never parse `message`. Error handling is written once.
- ✅ Our bugs (500s) and clients' mistakes (4xx) become distinct log events with different
  severities — the on-call signal isn't drowned by validation noise.
- ✅ Prisma known-errors (unique violations) map into the contract instead of leaking 500s.
- ❌ Every new error path must pick a code. That friction is the point — it forces the
  author to decide what _kind_ of failure this is.
