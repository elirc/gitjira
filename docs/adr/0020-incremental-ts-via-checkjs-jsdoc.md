# 0020 — Incremental TypeScript via checkJs + JSDoc (no build step)

**Status:** accepted · **Sprint:** 10

## Context

The team wants type safety; the app runs directly from source with no build step for the
server; a big-bang ".ts everything" PR is risky and would force a transpile step.

## Decision

Turn on TypeScript's checker over the existing JavaScript: `allowJs` + `strict`, `checkJs`
off globally, and per-file opt-in via `// @ts-check`. Types are written in JSDoc. A ratchet
enforces that the opted-in count only grows. Full `.ts` syntax is a documented later phase.

## Consequences

- ✅ Exactly the type safety of `.ts` (tsc reads JSDoc identically) with zero syntax change
  and no build step — the code stays runnable JavaScript.
- ✅ Migrate one file at a time; the ratchet prevents regressions while features ship.
- ✅ `z.infer` makes schemas serve as runtime validation AND static types.
- ❌ JSDoc is more verbose than `.ts` annotations for complex types.
- ❌ Some ecosystem types (Express req/res) need `@types/*` and more setup — deferred per file.
- ❌ Not the end state; `.ts` conversion + a build is a future phase (a documented playbook).
