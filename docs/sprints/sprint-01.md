# Sprint 01 — Foundation & Walking Skeleton · Learning brief

**Levels:** L1 (code), L4 (delivery) · **PR:** #8

## What this sprint teaches

1. **Monorepos**: what npm workspaces do (hoisting, linking) and when you don't need Turborepo. → ADR 0001
2. **Layered backends**: routes/controllers/services on a trivial endpoint, so the pattern exists before it is needed. → `apps/api/src/README.md`
3. **CI's actual job**: protecting `main`, not ceremony. Watch the checks tab on PR #8.
4. **Tooling as automation of standards**: lint/format/commit rules that machines enforce so review time goes to design.

## Read the PR in this order

Commits 1–3 (workspace + tooling) → 4–6 (API) → 7–9 (web) → 10–11 (infra + CI) → 12–13 (docs). Then the review thread — the two review findings on this PR are the sprint's real lesson.

## Exercises (on your own branch)

1. Add `GET /api/version` through all three layers, returning `{ version }` only. Match the existing shapes exactly.
2. Break the lint config on purpose (delete a `const` you use). Watch pre-commit refuse, then CI refuse. Fix it. You now know the two guardrails.
3. Add a `/settings` stub page and a sidebar item, following the existing stub pattern.

<details><summary>Hints</summary>

1. Three files change plus the router. The service reads `package.json` the same way health does.
2. Bypass the hook with `git commit --no-verify` to see CI catch it — then never use `--no-verify` again.
3. `NavLink` + a new page component; note how `end` works on the Home link.

</details>
