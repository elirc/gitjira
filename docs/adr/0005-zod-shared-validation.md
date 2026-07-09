# 0005 — Zod schemas shared between client and server

**Status:** accepted · **Sprint:** 02

## Context

Validation is needed twice: in the browser for instant feedback, at the API as the
security boundary. Written twice, the two drift — the classic "form allows what the
server rejects" bug class.

## Decision

One Zod schema per payload in `packages/shared`; the API's `validate()` middleware and
the web's `zodResolver` consume the same objects. Normalization (trim, lowercase) happens
in the schema so both sides see identical data.

## Consequences

- ✅ Drift is structurally impossible; error messages are consistent end to end.
- ✅ Normalization-before-uniqueness bugs (Bob@x.com ≠ bob@x.com) die in one place.
- ✅ Sets up sprint 10: `z.infer` will turn these runtime schemas into static types.
- ❌ Client bundles carry Zod (~14 kB gzip). Acceptable; revisit only if the perf budget
  (sprint 12) says otherwise.
- ❌ Server-only rules (e.g. "email already exists") still live server-side — the schema
  covers shape, not state.
