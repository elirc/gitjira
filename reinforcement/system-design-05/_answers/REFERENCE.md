# Reference reasoning: GitJira

Attempt the [design interview](../06-interview-lab.md) first. This is one defensible direction, not a unique correct architecture or a production patch.

## The core answer

Use authorized snapshots as the source of client truth and treat change notifications as recoverable invalidation hints initially. The invariant remains: **An issue mutation changes only permitted fields in its scope, and each affected view eventually reflects the accepted result without an obsolete session or query response taking ownership.**

Separate three identities: the issue or project scope, the current authenticated session, and one mutation intent. Sharing a refresh promise addresses overlapping refresh work inside its owner; it does not decide whether an old refresh response should still be applied after logout. A session generation or equivalent current-owner check is a proposed extension to reason about that race, not a claim that the inspected wrapper already contains it.

PATCH semantics stay in the shared public contract. Omission preserves a field while explicit null or zero follows the field's rule. The server constructs allowed updates rather than spreading arbitrary client fields into persistence. If optimistic concurrency is adopted, the expected version must participate in the authoritative write.

After a commit, update or invalidate every affected query projection. Moving an issue out of an open filter affects both its detail and its previous list membership. A notification can be a hint to refetch rather than a complete replacement record. That choice reduces payload coupling but shifts work to the read path and requires handling missed or duplicated hints.

If durable change delivery is needed, couple change intent to the database commit and let delivery retry separately. The browser should reconcile from an authorized current snapshot after reconnect. Do not make mutation success depend on every currently connected browser successfully refreshing.

## The failure answer must name the boundary

Design one test for shared-refresh cleanup after rejection and a separate test for logout during refresh. For board consistency, inspect both the old filtered list and the destination projection. A refresh failure must not retroactively relabel an already committed issue change as an uncommitted failure.

Reject an explanation that replaces this with a technology name. A queue does not by itself decide ownership, a transaction does not automatically include an external effect, and a cache key does not enforce authorization. Ask the learner to put the failure between two concrete steps and show the accepted, rejected, and unchanged state.

## Capacity and tradeoff answer

The fanout number is payload only and excludes protocol, encryption, reconnect, and retransmission overhead. Mean in-flight work is not a connection-pool recommendation or a p95 estimate. Measure how many projections each mutation invalidates before deciding that a streaming transport reduces total load.

The accepted cost is: Hints increase read work and need coalescing, while snapshots require a clear account/query identity and stale-response policy. The revisit trigger is: Consider richer delta streams only if measured read amplification or latency warrants the added ordering, replay, and schema-compatibility contract.

Accept alternatives that meet the same clarified contract and expose their costs. Do not reward unnecessary components or a fabricated production traffic number. The strongest follow-up asks what requirement would make this answer wrong and how the candidate would detect that change.

## What counts as completion

The learner can explain one happy path, one competing or failed path, the authoritative data identity, and one calculation with units. They can name the difference between inspected source and proposed design. An application guarantee still needs the corresponding runtime evidence. Historical tests remain historical; no new application verification is implied by reading these notes.
