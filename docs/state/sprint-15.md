# State of GitJira — after Sprint 15 (v1.0.0) 🎉

**Tag:** `v1.0.0` / `sprint-15` · **PR:** #141 · **Version:** 1.0.0 · **DONE.**

## What the system can do

A feature-complete Jira clone that is now **deployable, observable, and operable**:
packaged in non-root containers, boots only with valid config, ships behind a
gated pipeline that migrates safely, exposes RED metrics, and comes with a runbook
a stranger can follow at 2am.

## The change

```
   PACKAGE  →  VALIDATE  →  DEPLOY SAFELY  →  OBSERVE  →  OPERATE  →  DOCUMENT
   docker      env (Zod,     release-phase     /metrics    runbook +   ARCHITECTURE
   multi-stage fail fast)    migrations, gated  (RED)      practice     README + the
   non-root                  staging/prod              incident +      15-sprint RETRO
                                                        rollback drill
```

## Metrics (final)

| Metric          | Value                                         |
| --------------- | --------------------------------------------- |
| Sprints / PRs   | **15**, each a reviewed PR                    |
| Apps / packages | 3 apps (web/api/worker) + 4 packages          |
| ADRs            | **31**                                        |
| Releases        | v0.1.0 → **v1.0.0**                           |
| Deploy safety   | non-root containers, release-phase migrations |
| Observability   | /metrics (RED), health checks, request IDs    |

## For the junior: the whole journey

Read `docs/RETRO.md` — the fifteen-sprint retrospective with the recurring themes
tallied (authz-follows-the-transport ×4, check-then-act ×3, measure-before-you-
optimize throughout) — and `docs/ARCHITECTURE.md` for the system on one page with
every decision linking its ADR. Then read the 15 PRs oldest-first. That's the
curriculum.

**GitJira 1.0. Fifteen sprints, walking skeleton to production. 🎉**
