# State of GitJira — after Sprint 10 (v0.6.0)

**Tag:** `v0.6.0` / `sprint-10` · **PR:** #89 · **Version:** 0.6.0

## What the system can do

Functionally unchanged from v0.5.0 — this sprint hardened the codebase, not the product. The
API, real-time collaboration, notifications, and background worker all behave exactly as
before. What changed is underneath: TypeScript now checks a growing subset of the code, with
no build step and no rewrite.

## The change

TypeScript's checker runs over the existing JavaScript (`allowJs` + `strict`, `checkJs` off
globally). A file opts into checking with a top-of-file `// @ts-check`; types are written in
JSDoc, so every file stays runnable JavaScript. A ratchet keeps the migration honest.

```
                       tsconfig (allowJs, strict, noEmit)
                                    │
        // @ts-check per file  ─────┼─────  z.infer from Zod schemas
                                    │        (validator == static type)
                                    ▼
                    npm run typecheck  ──▶  CI Typecheck job (blocking)
                                    │
                    scripts/ts-ratchet.mjs ──▶ CI ratchet: opted-in count may only grow
```

## Architecture (delta)

No runtime architecture change. New dev-time layer: `tsconfig.json`, the `typecheck` and
`ts:ratchet` npm scripts, two new CI steps, and `scripts/ts-ratchet.mjs` + its baseline.

## Metrics

| Metric              | Value                             | Prev |
| ------------------- | --------------------------------- | ---- |
| Apps                | 3 (web, api, worker)              | 3    |
| Tests               | 105 (66 api + 10 web + 29 shared) | 97   |
| Migrations          | 10 (no schema change)             | 10   |
| Type-checked files  | 8 (ratchet baseline)              | 0    |
| Build step required | No (checkJs + JSDoc)              | No   |

## Type-checked so far (the 8)

`sprint-state-machine.js`, `errors.js`, `fractional-index.js`, `mentions.js`, `query-keys.js`,
`auth-schemas.js` (+ `z.infer`), `issue-schemas.js` (+ `z.infer`), `activity.js`
(discriminated union). Everything else remains valid, unchecked JavaScript.

## Tech-debt register (delta)

| Debt                              | Why                                              | Due             |
| --------------------------------- | ------------------------------------------------ | --------------- |
| Only 8/many files type-checked    | Incremental by design; ratchet drives the rest   | ongoing         |
| No `no-explicit-any` guard in CI  | File-count ratchet ≠ per-file `any` guard (#90)  | #90             |
| Types stop at the schema boundary | `z.infer` gives shape, not end-to-end wire types | revisit post-v1 |
| Express controllers untyped       | Need `@types/express`; deferred per file         | later sprint    |
| Not `.ts` + a real build          | checkJs is phase 1; `.ts` conversion is phase 2  | documented      |

## Known limitations

The type-checked surface is a minority of files — that's the point of a ratcheted migration,
not a defect. `any` can still hide inside an opted-in file until the `no-explicit-any` guard
lands (#90). Response shapes aren't end-to-end typed the way tRPC/codegen would give.

## For the junior: what to study here

1. **Migrating a living codebase** without stopping it — `docs/concepts/incremental-migration.md`.
2. **checkJs + JSDoc** — the same safety as `.ts`, zero syntax change, no build step.
3. **The ratchet** — how you make a migration's progress monotonic instead of hoping.
4. **`any` vs a real type** — the #89 review: `any` opts you out; a discriminated union caught
   a real unnarrowed-field access (`TS2339`) the moment it was introduced.
