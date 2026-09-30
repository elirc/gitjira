# Review notes: activity, notifications and positions

An activity row can roll back while a realtime hint already escaped. Invalidation avoids treating uncommitted payload values as authoritative, but a client can refetch before commit and remain stale if no later refresh occurs. A proposed freshness contract should choose postcommit emission, durable outbox delivery, periodic refresh or an explicit combination, with duplicate and reconnect behavior defined.

Not every recordActivity call necessarily emits; the inspected function requires projectId. An event-kind invalidation map should account for all affected queries, including source and destination columns and aggregate counts. Durable business history and transient hints have different meanings even when they share a seam.

Notification fan-out is asynchronous, but enqueueNotification itself is awaited in the inspected service path. A queue-submission failure can therefore produce an error after issue commit. An outbox can make intent durable with the issue change, while delivery still requires per-event or per-recipient identity and uncertain-outcome handling. Queue-disabled API tests do not prove delivery.

Fractional keys reduce the number of rows changed for ordinary moves, but deterministic keyBetween can give two concurrent same-gap inserts the same position. The design needs a tie policy or stronger move protocol if that matters. Generated-key properties, invalid-input validation, database collation and client concurrency are separate test claims.

Repeated narrow insertions can grow keys. A proposed rebalance must preserve order and coordinate with stale clients, perhaps through an ordering epoch. A single-row move is not a proof of constant storage size forever. A strong answer measures growth and specifies the compatibility behavior rather than treating the algorithm's introductory comment as an unlimited guarantee.

[Index](../README.md)
