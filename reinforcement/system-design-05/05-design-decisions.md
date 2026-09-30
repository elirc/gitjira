# Decision record and worked design journal

## ADR: the boundary chosen for this case

**Status:** proposed teaching decision, not an approved application migration.

**Context:** A contributor edits an issue while board and detail views are open. The session may expire during the request. The contributor sees one truthful mutation outcome, and both relevant projections refresh under the active session identity.

**Required invariant:** An issue mutation changes only permitted fields in its scope, and each affected view eventually reflects the accepted result without an obsolete session or query response taking ownership.

**Decision:** Use authorized snapshots as the source of client truth and treat change notifications as recoverable invalidation hints initially.

**Alternative considered:** Use periodic authorized polling with scoped query keys and revision-aware response handling. It simplifies connection and reconnect management but trades notification latency and idle request load for that simplicity. It is credible for small teams with a relaxed freshness requirement.

**Pitfall to reject:** Push complete mutable issue objects to every client and assume every event is delivered exactly once in order.

**Cost accepted:** Hints increase read work and need coalescing, while snapshots require a clear account/query identity and stale-response policy.

**Revisit trigger:** Consider richer delta streams only if measured read amplification or latency warrants the added ordering, replay, and schema-compatibility contract.

An alternative can become appropriate under a different workload or requirement. The purpose of the record is to make that change legible. A trigger should refer to measured contention, an operating requirement, a query/evaluation result, or a clear product constraint—not a preference for a more fashionable architecture.

## Worked journal: a fictional design-learning entry

The following paragraph is a teaching narrative, not a claim about the user's work or a new production incident.

I began with a WebSocket box because real-time boards sounded like a transport problem. The harder question was what the browser should do after missing a message. Treating notifications as hints gave me a recovery path through an authorized snapshot. I then separated session generation from query identity: a correct issue ID is still unsafe to apply under a logged-out or different account context. The existing refresh promise is useful, but its scope must remain explicit.

My next step would be to turn the strongest claim into a falsifiable example. I would state the initial values, put the competing action or failure at a specific boundary, and identify what must remain unchanged. If the source already implements the desired mechanism, I would characterize that behavior and preserve its evidence rather than propose a replacement just to make the exercise look larger.

I would also separate three levels of confidence: the diagram appears coherent, the code contains a relevant mechanism, and an executed test demonstrates the claimed outcome. Each is useful, but they are not interchangeable. The capacity worksheet supplies another kind of evidence: arithmetic under explicit assumptions. It does not fill in a missing benchmark or prove a service meets a latency objective.

## Write your own decision journal

Record the first design you considered, the concrete counterexample that changed it, and the simpler boundary you can now explain. Include one downside of the chosen design. Then change a requirement—higher contention, stricter freshness, a second process, revoked access, or an unavailable dependency—and explain whether the decision still holds.

Keep the actual source observation next to any claim about existing behavior. Label proposed APIs and schemas as proposed. If you later discuss this in an interview, distinguish reading, modeling, implementation, and runtime verification, and identify the artifacts you personally produced.
