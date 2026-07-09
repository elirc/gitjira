# Sprint 02 — Data Layer & Authentication · Learning brief

**Levels:** L1, L2, L3 · **PR:** #17

## What this sprint teaches

1. **Data modeling**: join-tables-with-payload (ProjectMember.role), storing hashes not secrets, schema-as-code. → the migration SQL + schema comments
2. **Auth architecture**: the access/refresh split, rotation, replay containment. → ADR 0004; the replay test in `auth.test.js` is the sprint in 12 lines
3. **Single-source validation**: one Zod schema, two enforcement points. → ADR 0005
4. **Integration testing**: real HTTP, real bcrypt, real Postgres; mock nothing you own. → `apps/api/test/`

## Read the PR in this order

Migration (commits 1–2) → shared schemas (3–4) → auth endpoints (5–8) → **the tests (9–10, read `auth.test.js` slowly)** → web auth (11–12) → seed (13) → review threads (the two findings are both "the code worked and was wrong").

## Exercises (on your own branch)

1. Add `passwordConfirm` to the register schema and form (client+server, field-level error when it mismatches). The API must reject a crafted request that skips the form.
2. Revert the replay-detection commit locally and watch which tests fail — then read what each failure tells you.
3. Find the three endpoints in this API that most need rate limiting, and say why. (Answer arrives in sprint 13.)

<details><summary>Hints</summary>

1. `.refine()` on the schema; the API change is zero lines beyond the schema.
2. `git revert --no-commit` the rotation commit; run `npx vitest run`.
3. Think: which endpoints do work whose cost the caller doesn't pay?

</details>
