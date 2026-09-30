# Capacity, bottlenecks, and growth decisions

All numbers here are **hypothetical exercise inputs**, not observed traffic, a benchmark, a production capacity claim, or a vendor quote. Units and boundaries are part of the calculation. The [machine-readable worksheet](capacity.json) is checked by the shared offline calculator.

| Question                                               | Assumptions                                            | Calculation                                   | Worked result  |
| ------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------- | -------------- |
| Illustrative board/detail read rate                    | active=2000, readsPerMinute=3                          | active × readsPerMinute / 60                  | 100 requests/s |
| Fanout payload for one subscribed project              | updatesPerSecond=10, subscribers=100, payloadBytes=500 | updatesPerSecond × subscribers × payloadBytes | 500000 bytes/s |
| Mean concurrent read work under a stable 200ms average | requestsPerSecond=100, meanSeconds=0.2                 | requestsPerSecond × meanSeconds               | 20 requests    |

## What these results imply—and what they do not

The fanout number is payload only and excludes protocol, encryption, reconnect, and retransmission overhead. Mean in-flight work is not a connection-pool recommendation or a p95 estimate. Measure how many projections each mutation invalidates before deciding that a streaming transport reduces total load.

**Illustrative board/detail read rate:** Counts the stated active population at the stated rate; not daily active users automatically acting simultaneously.

**Fanout payload for one subscribed project:** Payload bytes per second; excludes transport overhead, retries, reconnect storms, and downstream snapshot reads.

**Mean concurrent read work under a stable 200ms average:** A steady-state average relationship with matching boundaries. It is not a p95 estimate, hard concurrency cap, or worker-pool sizing proof.

## A second pass: remove the comfortable assumption

Choose the busiest tenant, world, route, event, or job represented by this design. Concentrate a substantial fraction of traffic there while leaving the aggregate rate unchanged. Explain whether the bottleneck becomes one row, one ordered stream, one subscription fanout, or a downstream quota. Aggregate averages can conceal that skew.

Now consider a cold cache, a worker restart, or a provider slowdown, whichever is relevant. Recalculate the request or drain rate using the same units. For a queue, if service capacity is equal to or below ongoing arrivals, an initial backlog has no positive drain rate under the model. Returning zero seconds would be a false result; the worksheet calculator uses null for that condition.

## Choose an intervention with a falsifiable trigger

Start with bounded queries, connection/concurrency budgets, and the actual dominant cost. Add caching only for eligible representations. Add workers only when downstream capacity and the ordering/ownership contract permit parallelism. Add a separate read projection or index only with an update, replay, and deletion story.

If proposing partitioning, name the partition key and the operations that cross it. If proposing replicas, identify reads allowed to be stale and the read-after-write behavior. If proposing admission control, explain the user outcome and fairness policy. These choices should preserve the invariant rather than merely move overloaded work out of view.

## Run the arithmetic checks

From the central system-design folder:

```powershell
node --test tools/check-capacity.mjs
```

The checks compare thirty hand-specified worksheet results and additional calculator boundary cases. They validate arithmetic and model preconditions only. They do not measure this application's performance. Keep load-test plans and actual measured evidence separate from these worked numbers.
