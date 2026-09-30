# 12. An invalidation hint before commit can arrive too early

[recordActivity](../../apps/api/src/services/activity.service.js) writes an ActivityEvent through the supplied transaction when present. When projectId is supplied, it also emits a lightweight realtime activity hint containing kind and identifiers. The source explains that clients invalidate and refetch rather than trust uncommitted full values. That is a useful design intention, but timing still matters.

## Separate persistence from emission

The activity row participates in the caller's database transaction. The realtime emission does not become rollbackable merely because the function is called inside that transaction. If the transaction rolls back, the row disappears but the hint may already have reached a client. A hint that causes a harmless refetch is safer than broadcasting uncommitted authoritative values, yet it is still an externally visible event.

Create a test in which recordActivity emits and then a later transaction statement fails. Assert that the activity row is absent after rollback. Inspect the emitted hint separately. The expected behavior should reflect the current implementation rather than assuming no event escaped. This teaches why durable state and transient notifications require separate evidence.

## The early-refetch gap

Now let the transaction eventually commit. A client can receive the hint and refetch before commit, observing the old state. If no later hint or refresh occurs, it may remain stale after the transaction commits. Therefore “invalidate instead of patch” avoids displaying uncommitted values but does not by itself guarantee the client eventually sees the committed update.

Design a controlled schedule with an emission barrier and a database commit barrier. Let the client refetch between them. Record the returned state, release commit and observe whether another mechanism refreshes the client. This is a source-derived timing hypothesis to test, not a claim that the deployed UI always stays stale.

## Compare postcommit publication strategies

One proposal emits only after the transaction returns successfully. That avoids early-refetch timing for the same command, but a process crash after commit and before emission can lose the hint. Another records an outbox event in the transaction and lets a worker emit later. That provides durable intent but adds delivery retries, ordering and duplicate handling. A third uses periodic refetch as an eventual recovery mechanism.

Choose a product-level freshness contract before selecting machinery. A collaborative board may tolerate a short delay and recover on focus. A critical approval screen may need stronger version confirmation. The correct design depends on what clients are allowed to infer, not merely on which architecture sounds more sophisticated.

## Payload meaning

The hint contains kind, issueId and actorId. It does not contain the full new issue state. That keeps the message small and directs clients to an authorized read path. The client still needs to know which queries to invalidate. A hint for an issue move can affect the issue detail, source column, destination column and aggregate counts. Invalidating only one cache key may leave other views stale.

Build an invalidation map by event kind. Include issue creation, priority change, assignee change and status change where supported. Mark which current recordActivity callers actually pass projectId; the function only emits in that branch. Do not infer universal realtime delivery from one seam if callers omit the required context.

## Activity semantics

An ActivityEvent is a business-history record. Its payload should describe the command's meaningful change, while a realtime hint tells clients something may have changed. These two uses have different retention and accuracy requirements. A durable history entry with stale from values is a semantic problem even if the hint is sufficient to trigger a refresh.

Review event descriptions in the shared activity formatter when extending kinds. A new kind may persist successfully but render as an unhelpful fallback if consumers are not updated. Versioning event payloads can help when old rows outlive new code, but the version needs an actual reader strategy rather than a field added without use.

## Exercise

Submit a timeline for rollback after emission and another for early refetch before successful commit. Propose a freshness contract and a delivery design that meets it. Include duplicate-hint behavior and a disconnected client that reconnects later. A strong answer recognizes both the benefit of lightweight invalidation and the remaining delivery gap.

[Index](README.md) · [Review notes](answers/07-events-and-order.md)
