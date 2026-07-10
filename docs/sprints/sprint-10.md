# Sprint 10 — TypeScript Migration · Learning brief

**Levels:** L4, L5 · **PR:** #89 · **Release:** v0.6.0

## What this sprint teaches

1. **Migrating a living codebase** — strangler fig, not big-bang. → `docs/concepts/incremental-migration.md`, ADR 0020
2. **Type safety without a build step** — checkJs + JSDoc; the checker reads JSDoc like `.ts`.
3. **The ratchet** — making migration progress monotonic. → `scripts/ts-ratchet.mjs`
4. **Schemas as types** — `z.infer` so validation and types can't drift. → ADR 0021
5. **`any` is opting out** — the planted finding: silencing the checker vs using it.

## Read the PR in this order

`tsconfig.json` (allowJs + opt-in) → the JSDoc annotations on the typed modules → the ratchet
script + CI wiring → **the review thread** (the planted `any` in activity.js → a real type).

## Exercises

1. Migrate one more JS file: add `// @ts-check`, fix what the checker flags, bump the baseline.
2. Convert `activity.js`'s event type to a proper discriminated union on `kind`, and delete the runtime `?.` guessing.
3. Find the two `@types/*` packages you'd need to type an Express controller, and type one.

<details><summary>Hints</summary>

1. The ratchet will tell you to bump the baseline when the count grows.
2. `@typedef {{ kind: 'status.changed', payload: {from,to} } | { kind: 'comment.added' } | ...}`.
3. `@types/express`; the req/res types come from there.

</details>
