# Review notes: actual-source lab and final review

The Node harness imports the actual pure keyBetween implementation and exercises generated keys under JavaScript comparison. Its fixed seed makes failures reproducible. It does not prove database collation, malformed-input policy or concurrent-client uniqueness. Deterministic same-gap output explains why a separate tie or move protocol is needed.

Performance reports should distinguish cold and warm caches, queue-disabled and queue-enabled paths, database time, payload size and client rendering. Historical source comments are context, not current measurements. A proposed optimization must retain focused invariant tests, including failure and boundary cases. Faster stale data is a consistency tradeoff that must be explicit.

The maintenance review should compare comments with code without discarding useful design intent. General update version checks, awaited enqueue and precommit invalidation each illustrate a narrower current contract than a casual phrase might suggest. A claim map should follow schemas, services, clients and tests when a shared contract changes.

For the paired review, full credit requires a concrete command identity, acceptable state set, testable enforcement point and mutation-sensitive evidence. The user explanation and technical description must agree. A remaining limitation is not a failure if it is named honestly with a narrow next test; an unsupported absolute guarantee is a failure of the review.

[Index](../README.md)
