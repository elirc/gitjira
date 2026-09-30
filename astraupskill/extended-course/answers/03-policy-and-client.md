# Answers: retries, authority and clients

The helper runs at most three attempts. A recognized P2034 on either of the first two permits retry; the third produces conflict. Other errors propagate. The type check matters, so a plain object with a code property is not necessarily a valid fixture for this path. On each retry the callback reruns its reads and business rules, which may now reject the original intent.

External notifications inside that callback could run more than once even if one database attempt rolls back. A proposed outbox records intent atomically with local changes and delivers separately. It still needs a delivery identity, retry policy and handling of uncertain remote outcomes. Full credit requires describing both boundaries rather than calling the outbox exactly once.

Membership cache invalidation is part of the supported authorization path. A test should warm the cache, mutate membership through the service and then attempt the protected action. A single-process cache test does not prove distributed invalidation behavior. The inspected authorization call precedes the sprint transaction, so a policy requiring authority at commit would need additional design and evidence.

For the client, keep the loaded token, requested destination and request identity distinct. A late response belongs to the request that produced it. A lost response does not prove a canceled server command. Refetch durable state when the outcome is unknown, preserve unsaved intent for comparison, and treat permission failures differently from optimistic conflicts.

An answer earns full credit when it names the desired authority timing rule instead of assuming one. Request-admission authority and commit-time authority can produce different outcomes during membership removal. The system should implement and explain its chosen contract, with tests at the actual boundary.

[Index](../README.md)
