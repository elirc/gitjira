# Sol: initial independent design review

Model: gpt-6-sol, high reasoning effort. Received before implementation. This records the agent's explicit engineering rationale, not private reasoning.

Sol recommended Express + SQLite + vanilla JS for this local product. React was a viable alternative but added tooling without improving the critical data invariants. The strongest objection was that a polished board could look complete while client-only permissions leaked data or read-then-write checks lost updates.

Requested constraints: membership checks on every route; SQL compare-and-swap updates; mutation and activity in one transaction; foreign keys/WAL/busy timeout; soft deletion; no implied within-column ranking; random HttpOnly sessions; explicit local-demo login boundary; last-owner protection if membership editing ships.

Requested tests: persistence after restart, valid edit and matching event, viewer denial, cross-project ID isolation, exactly one winner for concurrent same-version updates, invalid inputs with no events, safe literal search, archived issue exclusion, and transaction rollback when the event insert fails.

Root accepted these constraints. Node 22.16.0 was verified to support node:sqlite on this laptop, avoiding a new native compiler dependency. The tradeoff is a synchronous, experimental runtime API suitable for this local edition, not a claim of high-throughput service design.
