# 1. Decide which layer owns a sprint rule

Read [the sprint state machine](../../apps/api/src/domain/sprint-state-machine.js) and [the sprint service](../../apps/api/src/services/sprint.service.js) together. The state machine names legal per-sprint transitions. The service loads project-scoped records, authorizes actions and performs database work. Some invariants span multiple rows and therefore cannot be established by a pure function that sees only one sprint.

## Three different rules

A planned sprint may start only when it contains at least one issue. The state machine checks that local transition precondition using issueCount. An active sprint may complete, while a completed sprint may not complete again. These are per-sprint rules. The “one active sprint per project” rule compares multiple sprints. The source identifies a database partial unique index as its enforcement point; inspect the relevant schema and migrations before treating a particular database instance as correctly configured.

Authorization answers a different question: may this actor manage sprints in this project? A valid transition is not permission to perform it. A user can propose a legal PLANNED-to-ACTIVE transition and still lack the required project role. Conversely, a project administrator cannot make an illegal completed-to-active transition legal merely by having broad permissions. Keep role rules and lifecycle rules in separate columns of your reasoning.

## Work a small example

Project GJ has planned sprints S1 and S2, each containing one issue. Two authorized users start them concurrently. Both state-machine checks can pass because each function sees its own planned sprint with a positive issue count. That does not contradict the state machine's purpose. The cross-sprint database constraint must reject one resulting active row. The service translates a recognized unique violation into a conflict response.

Now give S2 zero issues. Its start should fail the per-sprint guard before the cross-sprint rule becomes relevant. This is a different failure with a different explanation. A test that only observes a generic 409 can miss which rule actually fired. Assert the message or structured error where stable, and inspect unchanged durable state. This matters when diagnosing a regression: an accidental authorization failure should not make a transition test appear successful.

## canTransition is a smaller predicate

The exported canTransition helper checks whether an action's source state matches the current state. It does not run the issue-count guard. A button enabled from that helper alone can still produce a rejected command for an empty planned sprint. This is a concrete example of a helper name sounding broader than its implementation.

Write two unit cases: canTransition for start from PLANNED, and assertTransition for start from PLANNED with zero issues. The former returns true; the latter throws a conflict. Explain why both results can be correct under the current contracts. If a product wants the UI to predict all guards, propose a richer capability response or a shared guard evaluation API. Do not silently redefine the existing helper in a documentation exercise.

## Build an invariant map

For each rule, name its scope, inputs, authoritative enforcement point and evidence. Include legal state transitions, nonempty start, one active sprint, destination project ownership, no assignment to a completed sprint, optimistic issue version, and moving unfinished issues when completing. Add a column for writers that can affect the rule. A database constraint only helps if its expression matches the intended invariant; a transaction only helps if all relevant writes participate.

The map should distinguish an invariant from an interface preference. Sorting sprints by createdAt is useful presentation behavior. Rejecting a cross-project destination protects data ownership. Both deserve tests, but their failure consequences differ. Prioritize the constraints that prevent impossible or unauthorized states before polishing incidental ordering.

## Exercise and acceptance

Produce a one-page map and three counterexamples: a legal transition by an unauthorized user, two individually legal starts that violate the project rule, and a state-only capability check that passes while a guard fails. For each, identify the layer that must reject it. Your answer passes when another learner can find the enforcement site without relying on broad claims such as “the backend validates everything.”

[Index](README.md) · [Answers](answers/01-state-and-time.md)
