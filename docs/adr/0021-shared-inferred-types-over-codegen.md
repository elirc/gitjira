# 0021 — Shared inferred types (z.infer) over codegen/tRPC

**Status:** accepted · **Sprint:** 10

## Context

We want the same type on both sides of the wire. Options: a codegen step (OpenAPI/tRPC) or
inferring types from the Zod schemas we already share.

## Decision

Export `z.infer` types from the shared schemas and import them via JSDoc. No codegen, no new
dependency.

## Consequences

- ✅ One declaration is validator AND type; they can't drift.
- ✅ No build/codegen step; the schema package we already have does the job.
- ❌ Types stop at the schema boundary — response shapes aren't end-to-end typed the way tRPC
  would give. Acceptable now; revisit if the hand-typed client becomes a maintenance burden
  (a "revisit post-v1" note, per the sprint-10 discussion).
