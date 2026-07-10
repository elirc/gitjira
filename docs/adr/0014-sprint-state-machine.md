# 0014 — Sprint lifecycle as an explicit state machine

**Status:** accepted · **Sprint:** 07

## Context

A sprint moves PLANNED → ACTIVE → COMPLETED with rules on each transition. The options are
boolean flags + scattered checks, or an explicit state machine.

## Decision

A state machine modeled as a transition table with guards, in a domain module
(`sprint-state-machine.js`), tested without HTTP or a database.

## Consequences

- ✅ Rules live in one auditable place; illegal transitions rejected uniformly.
- ✅ Guards are pure → millisecond unit tests covering every legal and illegal move.
- ✅ Adding a state later is adding rows, not hunting conditionals.
- ❌ Slightly more ceremony than an `if` for a two-transition machine — but the machine is
  the thing juniors should copy, and the ceremony is the lesson.
