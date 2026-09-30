# 9. Invalidation can race a pending cache load

[The cache module](../../apps/api/src/lib/cache.js) uses a pluggable store and a per-process map of in-flight promises. Concurrent misses for the same key can share a loader. The promise is removed in finally. Invalidation deletes the stored key. Those mechanisms solve useful problems, but their interaction deserves its own schedule analysis.

## Follow a normal cold read

A request asks for a project membership map. The store has no unexpired value, and no in-flight promise exists. The cache starts the loader, records the promise, waits for the database result, writes it with a TTL and returns it. Another request that misses while that promise is present awaits the same work. In one process, this reduces duplicate loads for the same key.

The source explicitly makes this single-flight map local to the process. Multiple API instances can still load a cold key independently. A shared Redis store does not make the JavaScript promise map distributed. State this limit when reporting a concurrency test; one-process call counts are not cluster-wide call counts.

## A pending load can outlive invalidation

Consider a loader that reads the old member map and pauses before storeSet. A membership mutation commits and invalidates the stored key. The old loader then resumes and writes its stale value into the cache. Deleting a key did not cancel or version the already-running load. The inspected invalidate function does not modify the in-flight map or attach an epoch to the store write.

This is a source-derived race hypothesis. Reproduce it with a controlled loader and a gate before completion. Warm or clear the store as needed, start the load, perform invalidation, release the old result and inspect the next read. A test that only warms a completed cache entry before invalidating it covers a different schedule and can miss this case.

## Why deleting the promise is not enough

A tempting repair removes the in-flight entry during invalidation. That permits a new loader, but the old promise may still finish and call storeSet. Without an additional generation check or cancellation contract, the stale result can still overwrite a newer one. It can also run finally and delete the map entry for a newer promise if cleanup is not identity-aware.

Propose a per-key generation number. A loader captures the generation and writes only if it still matches. Invalidation advances the generation and deletes the stored value. For a shared multi-instance store, explain whether the generation is local or shared and what that means for the guarantee. A local epoch fixes only the local schedule unless the distributed protocol is extended.

## Failure and TTL semantics

The finally block removes an in-flight entry even if the loader or storeSet rejects. That prevents a rejected promise from remaining permanently shared in the ordinary path. Write a test with a loader that fails once and succeeds next time. Count invocations and ensure the second call can try again. Then test a store failure separately; it may affect whether the caller receives loaded data or an error under the current implementation.

The memory store expires an entry when expiresAt is less than the current time. At exact equality, the inspected comparison does not yet evict it. A boundary test should use a controlled clock rather than sleeping. Whether equality should count as expired is a contract choice; characterize current behavior before proposing a change.

## Authorization implications

When the cached value is a member map, stale resurrection can affect permission decisions. The course does not assume a deployment is vulnerable from this source schedule alone; it asks you to build evidence and define the desired revocation guarantee. Membership mutation, cache invalidation and authorization timing must be considered together.

Submit a normal-load sequence, a stale-resurrection sequence, an identity-aware cleanup design and a generation proposal. Explain which tests use memory and what additional evidence Redis or multiple processes require. A strong answer treats caching as a consistency protocol when it influences authority, not merely as a performance wrapper.

[Index](README.md) · [Review notes](answers/05-issue-and-cache.md)
