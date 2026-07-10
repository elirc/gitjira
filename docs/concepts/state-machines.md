# Concept: state machines for domain rules

_A one-page primer, readable without the codebase. It explains the idea behind the sprint
lifecycle in Sprint 07._

Lots of domain objects have a **lifecycle**: an order is placed → paid → shipped → delivered;
a sprint is planned → active → completed. The naive way to model this is a pile of boolean
flags (`isActive`, `isCompleted`) and scattered `if` checks. That approach rots: the flags
can contradict each other (`isActive && isCompleted`?), and the rules ("you can only ship a
paid order") end up copy-pasted across the codebase.

## A better model: states + transitions

A **finite state machine** says an object is in exactly ONE of a fixed set of states, and
only certain **transitions** between them are legal.

```
PLANNED ──start──▶ ACTIVE ──complete──▶ COMPLETED
```

Model it as **data**, not control flow — a table of allowed transitions:

```js
const TRANSITIONS = {
  start: { from: 'PLANNED', to: 'ACTIVE', guards: [hasAtLeastOneIssue] },
  complete: { from: 'ACTIVE', to: 'COMPLETED', guards: [] },
};
```

Now "can I complete this sprint?" is a table lookup, not a scattered condition. Illegal
transitions (completing a PLANNED sprint) are rejected in one place. Adding a state later
(CANCELLED) means adding rows, not auditing every conditional.

## Guards

A **guard** is a precondition on a transition — "a sprint must have at least one issue to
start." Guards are pure functions of a context object, which makes them trivially testable
with no database and no HTTP: pass a context, assert the verdict. That's the whole test suite.

## Where the rules live (and don't)

Per-object rules ("this transition is legal from this state") belong in the state machine.
But some invariants span multiple objects — "only one active sprint per project." That one
can't be a state-machine guard, because under concurrency two requests can both check "is
there an active one?" and both get "no." **Cross-object invariants belong in the database**
(a partial unique index here). The state machine owns the per-object rules; the database
owns the cross-object truth. Knowing which is which is the senior instinct this sprint teaches.

## Go deeper

- XState (a JS state-machine library) — you don't need it for small cases, but its docs
  explain the model well.
- "Domain Modeling Made Functional" (Wlaschin) — states as types.
