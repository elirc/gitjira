# GitJira roadmap

v1.0.0 shipped all fifteen sprints (see `docs/RETRO.md` and the releases). The
sprint issues from that build are closed; the open issues are real pending work.
What follows is the next round, taken from the "Priority order" in
`docs/process/WORKFLOW-IMPROVEMENTS.md` and the open tech-debt issues.
Status as of 2026-11-06.

## Open tech debt (issues)

- #28 Audit which write endpoints should reject unknown fields (`zod .strict`).
- #90 `no-explicit-any` lint rule for `@ts-check` files, plus a `shared/types`
  barrel.
- #101 Stabilize the web component runner so web coverage can be gated in CI.

## Next round (WORKFLOW-IMPROVEMENTS.md, priority order)

1. **Keep local equal to CI.** No hook bypassing; push, wait for CI, respond to
   CI (sections 1 and 6).
2. **Verification evidence on every "done".** Attach the command and its real
   output to the PR (section 2).
3. **One real, hard debugging session**, with the false starts left in: a
   confusing symptom, hypotheses formed and killed, `git bisect`, added logging
   (section 4).
4. **Label the review honestly** (section 3).
5. **One previously missing senior skill, executed for real** (section 5), in
   this order:
   - a dependency upgrade with a breaking change: read the changelog, fix the
     fallout, commit the real `gitleaks` and `npm audit` output;
   - load testing actually run with autocannon or k6, with p50/p95/p99 under
     concurrency;
   - a timed deploy and rollback against the prod-parity compose stack;
   - Stryker mutation testing with an analysis of the surviving mutants;
   - an axe CLI run attached as evidence for the accessibility work;
   - an induced regression diagnosed from `/metrics`.

## Cross-project practices (section 7)

- A "skills demonstrated" ledger mapping each PR to the senior skill it shows.
- A committed self-audit at the end of the round, to diff against
  `docs/process/AUDIT-2026-07.md`.

## Learning edition

- Keep the October 2026 local rebuild (`rebuild/`) and the upskilling course
  (`astraupskill/`) in step with `main` as the items above land.
