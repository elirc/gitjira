# Answers: rules and version tokens

The state machine owns the legal source and destination states and the nonempty-start guard. It does not own actor permission or the project-wide active-sprint uniqueness rule. Two planned, nonempty sprints can each satisfy their pure transition check while their combined active state is invalid. The database constraint and service error translation address that cross-row case.

canTransition checks only whether the source state matches the transition table. Consequently it can return true for start from PLANNED even when issueCount is zero. assertTransition evaluates the guard and rejects that same empty start. A good UI contract should make this difference visible instead of presenting the smaller helper as complete permission to execute.

The timestamp calculations are 1200, 1001, 1001 and 10000 for the worksheet pairs. The expression ensures advancement relative to the stored millisecond token. It does not prove physical time moved forward, nor does it establish an ordering across every issue. A future stored timestamp remains a valid concurrency token even while its display looks surprising relative to the current clock.

Two requests carrying the same expected token cannot both match after one successfully advances the stored value, assuming the intended atomic update and storage precision. An omitted expected token removes that specific predicate in the inspected service. A complete answer must mention the optional request shape and investigate route/client validation before claiming universal protection.

After a stale conflict, preserve the requested sprint as unsaved intent and compare it with current durable state. Automatically replacing the version and retrying hides the intervening change from the user. A fresh destination validation is still required because the destination may have completed. Optimistic version checking and lifecycle validation protect different facts.

[Index](../README.md)
