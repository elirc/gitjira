# Skills-demonstrated ledger

A running map of **which artifact showcases which senior skill**, and — honestly —
whether it was **executed with real evidence** or is **config/narrative only**.
Gaps are meant to be visible. Updated every round.

Legend: ✅ executed + evidenced · 📄 config/docs only · 🎭 teaching device (e.g.
self-review, planted bug)

## Sprints 1–15 (the original build)

| Skill                           | Where                     | Status                                |
| ------------------------------- | ------------------------- | ------------------------------------- |
| Walking skeleton / thin slice   | Sprint 1                  | ✅                                    |
| Auth: rotation + replay detect  | Sprint 2                  | ✅                                    |
| Concurrency (atomic allocation) | Sprint 3 (red→green test) | ✅                                    |
| Fractional indexing             | Sprint 4                  | ✅                                    |
| Parser/tokenizer (JQL)          | Sprint 6                  | ✅                                    |
| State machine as data           | Sprint 7                  | ✅                                    |
| Realtime + room authz           | Sprint 8                  | ✅                                    |
| Idempotent background jobs      | Sprint 9                  | ✅                                    |
| Incremental typing + ratchet    | Sprint 10                 | ✅                                    |
| Test isolation / contract tests | Sprint 11                 | ✅                                    |
| Perf: indexes/cache (measured)  | Sprint 12                 | ✅ (real EXPLAIN + query counts)      |
| RBAC + IDOR fix                 | Sprint 13                 | ✅ (exploit test real)                |
| Design tokens + a11y in code    | Sprint 14                 | ✅ (unit-tested)                      |
| Dockerfiles / deploy config     | Sprint 15                 | 📄 (never built/deployed — see below) |
| Code review as dialogue         | all PRs                   | 🎭 (single-author self-review)        |
| E2E (Playwright)                | Sprint 11/14              | 📄 (specs written, never ran green)   |
| Accessibility via a real tool   | Sprint 14                 | 📄 → now ✅ (this round)              |
| Incident + post-mortem          | Sprint 15                 | 🎭 → now ✅ (this round)              |
| Load / stress testing           | —                         | ❌ → now ✅ (this round)              |
| Mutation testing                | —                         | ❌ → now ✅ (this round)              |
| Dependency/security tool run    | —                         | ❌ → now ✅ (this round)              |
| Real hard-debugging session     | —                         | ❌ → now ✅ (this round)              |

## Round: `chore/workflow-hardening` (this PR)

Turns the ❌/📄/🎭 rows above into ✅ with **real, committed evidence** under
`evidence/`. See each commit's Verification section and `workflowoutcome.md`.
