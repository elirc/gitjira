# Review notes: issue writers and cache races

The general issue update compares expectedUpdatedAt against a loaded row and later writes by identifier. Sprint assignment places the expected token in the mutation predicate when supplied. The difference creates a source-level race hypothesis for the general path. A controlled test should show both comparisons pass before either final write, then inspect the final field and activity history.

Atomic activity persistence does not prove that the payload's from value came from the immediately preceding durable state. A stale pretransaction issue object can produce stale history semantics. A consistent proposed protocol should bind the before-state and update to the same version contract and cover all writers that can change the field.

For cache stale resurrection, pause a loader after it has obtained an old membership map, invalidate after a membership mutation, then release the old loader. Deleting the stored key alone does not stop the pending storeSet. Deleting the in-flight map entry alone also does not stop the old promise from writing later.

A generation proposal should compare the loader's captured generation before storing. Cleanup should be identity-aware so an older promise cannot delete a newer in-flight entry. A local generation only establishes a local-process guarantee unless the shared-store protocol coordinates instances. The test report must distinguish memory-store checks from Redis and multi-process behavior.

The memory expiry comparison uses less-than, so exact equality is not expired in the inspected code. A controlled clock can characterize this without sleeping. Loader rejection should remove the ordinary in-flight entry through finally, allowing a later call to try again. Store rejection is a separate case that deserves its own outward-result assertion.

[Index](../README.md)
