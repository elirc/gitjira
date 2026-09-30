# Failure and recovery: GitJira

This is a tabletop and integration-planning lab. It introduces no deliberate application defects and does not run infrastructure.

## Worked timeline

| Event or failure point                        | Authoritative/durable state        | User or worker consequence                               |
| --------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Board and detail display issue I as open      | Both are derived reads             | Local draft is separate                                  |
| Issue move commits                            | Authoritative status becomes done  | Mutation can succeed before all reads refresh            |
| Detail refresh succeeds; board hint is missed | Board can temporarily be stale     | Reconnect/poll/refetch must reconcile                    |
| Logout occurs while old refresh is pending    | Active session owner changes       | Old response must not resurrect the session              |
| Duplicate change hint arrives                 | Current snapshot remains authority | Coalesce refetch work rather than repeating the mutation |

The invariant across the timeline is **An issue mutation changes only permitted fields in its scope, and each affected view eventually reflects the accepted result without an obsolete session or query response taking ownership.**. Mark which transitions are atomic, which are observations, and which can be delivered again. A repeated message and a repeated effect are not the same thing. Selection, claiming, execution, committing, and acknowledging should remain separate words until the actual implementation proves they share a boundary.

## Focused proof plan

Design one test for shared-refresh cleanup after rejection and a separate test for logout during refresh. For board consistency, inspect both the old filtered list and the destination projection. A refresh failure must not retroactively relabel an already committed issue change as an uncommitted failure.

Preserve the fixture and initial state. Inject one failure at a named point, inspect all relevant effects, then recover using the same logical identity when the contract requires it. A test that only checks an exception can miss leaked durable changes. A test that mocks the critical repository may assume the property it was intended to establish.

## Three additional disturbances

**Dependency unavailable:** choose the dependency this design actually needs. Specify whether the operation fails, queues durably, serves a permitted stale read, or continues in a reduced mode. Define a bound on fallback work so recovery does not overload the next dependency.

**Duplicate or reordered input:** reuse an operation/event identity and vary delivery order. Explain which replays are harmless, which conflicting payloads must be rejected, and which outcomes require reconciliation. Do not promise exactly-once transport when the guarantee is really one durable effect per accepted identity.

**Old worker or client resumes:** let an earlier owner finish after scope, revision, session, or lease ownership changes. Identify the check at application/commit time that prevents obsolete work from taking ownership. Cancellation at launch is not enough to explain this case.

## Recovery and observability

Measure mutation acceptance separately from query refresh failures, refresh attempt/error counts, stale-view age where observable, and notification backlog. A successful auth refresh is not evidence that a particular board projection is current.

Set a hypothetical recovery objective for the authoritative dataset and a separate one for rebuildable projections. State the allowable data-loss window (RPO) and time to useful restored service (RTO), then describe a restore rehearsal that could measure them. Do not claim those objectives are achieved merely because a backup command exists.

After a restore, decide how outstanding receipts, delayed events, and external effects reconcile with the restored state. A database restored to an earlier point can forget a previously accepted operation while an external effect still exists. The recovery plan needs that case, not only row counts after restoring a file.

## Handoff artifact

Write one page containing the failure trigger, expected durable state, exact identity used on retry, distinguishing observation, recovery action, and remaining uncertainty. A teammate should be able to tell whether your evidence comes from source reading, a pure model, a database exercise, or an external integration. Human learning and runtime guarantees remain separate assessments.
