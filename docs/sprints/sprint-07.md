# Sprint 07 — Backlog, Sprints & Agile Planning · Learning brief

**Levels:** L2, L5 · **PR:** #66 · **Release:** v0.3.0

## What this sprint teaches
1. **State machines for domain rules** — transitions as data, guards as pure functions. → `sprint-state-machine.js`, `docs/concepts/state-machines.md`, ADR 0014
2. **Where invariants live** — per-object rules in the domain, cross-object rules in the DB. → the partial unique index, ADR 0015
3. **Check-then-act is a lie under concurrency** — the "one active sprint" race (a planted finding), echoing the sprint-03 counter.
4. **Atomicity** — the complete-sprint bulk move must be one transaction (the other planted finding).
5. **Modeling a state as the absence of a relationship** — the backlog is "no sprintId".

## Read the PR in this order
migration (partial index) → `sprint-state-machine.js` + its pure tests → `sprint.service.js`
(note the two GOTCHA comments) → **the review threads** (the constraint-violation race and
the non-atomic move) → the backlog page.

## Exercises
1. Add a `CANCELLED` sprint state. Propose the transition rules in a comment first, then add the rows.
2. Reproduce the "two active sprints" race by removing the DB index locally; watch what breaks.
3. Write the completion-edge tests: completing with 0 issues done, and with all done.

<details><summary>Hints</summary>

1. CANCELLED is reachable from PLANNED and ACTIVE; is it reachable from COMPLETED?
2. Drop the index, then fire two starts with Promise.all in a test.
3. The report already computes committed/completed — assert both extremes.
</details>
