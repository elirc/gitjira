# 04. GitJira: worked examples and learning journals

An issue tracker combines shared request schemas, board/detail views, and session-aware API calls. Explain PATCH semantics, query identity, asynchronous refresh ownership, and how a user learns that a save failed.

This fourth block complements the [original foundations](../README.md), [second practice block](../expansion-02/README.md), and [interview library](../interview-03/README.md). It adds slower, solved explanations and several ways to work through the same mechanism. Earlier files and unfinished exercises are preserved.

## Choose how to begin today

- **Read a complete example:** choose a slow explanation below. It starts with a concrete fixture and derives the expected result.
- **Follow a narrated thought process:** use a worked journal. These are explicitly fictional teaching narratives, not records of your work or new production incidents.
- **See the relationships:** use the workshop diagrams and model trace tables. Label references, requests, and state ownership separately.
- **Run and inspect:** start with [the runnable worked notebook](WORKED-NOTEBOOK.md), which checks three concrete examples against the existing teaching reference.
- **Speak and reflect:** follow a workshop's teach-back route and use [your own journal template](MY-JOURNAL.md).

These are complementary activities, not fixed categories of people. Switch formats when it helps you notice a missing assumption. The [learning pathways](PATHWAYS.md) and [review plan](REVIEW-PLAN.md) offer bounded sessions so this library does not become a requirement to read everything in sequence.

## Six project cases, three complementary treatments

| Case | Situation                                  | Explanation                       | Narrative                        | Activity                                |
| ---- | ------------------------------------------ | --------------------------------- | -------------------------------- | --------------------------------------- |
| 1    | Omitted and cleared fields collapse        | [Read slowly](explanations/01.md) | [Worked journal](journals/01.md) | [Draw / build / speak](workshops/01.md) |
| 2    | One refresh request serves several callers | [Read slowly](explanations/02.md) | [Worked journal](journals/02.md) | [Draw / build / speak](workshops/02.md) |
| 3    | Logout occurs during refresh               | [Read slowly](explanations/03.md) | [Worked journal](journals/03.md) | [Draw / build / speak](workshops/03.md) |
| 4    | Board and detail disagree after a save     | [Read slowly](explanations/04.md) | [Worked journal](journals/04.md) | [Draw / build / speak](workshops/04.md) |
| 5    | Dependencies contain a cycle               | [Read slowly](explanations/05.md) | [Worked journal](journals/05.md) | [Draw / build / speak](workshops/05.md) |
| 6    | A stale closure saves an old title         | [Read slowly](explanations/06.md) | [Worked journal](journals/06.md) | [Draw / build / speak](workshops/06.md) |

The situations extend the earlier interview scenarios. Their new treatments are solved reasoning, reflection, and transfer practice rather than another set of unanswered interview prompts. A scenario can describe a synthetic failure without asserting that the current application contains that defect.

## Twenty-six transferable worked models

These model chapters are intentionally available in each project pack for a self-contained reading route. Their technical core is shared across projects; the source connection and local case references adapt the learning context. Do not count them as 260 different algorithms.

- [Two names, one nested object](models/01-aliases.md)
- [A filtered view is not a second database](models/02-derived-values.md)
- [Position changes while identity stays put](models/03-stable-identity.md)
- [Which value does the delayed work belong to?](models/04-closure-timeline.md)
- [Three values that truthiness collapses](models/05-missing-null-zero.md)
- [Valid JSON with an invalid relationship](models/06-runtime-boundary.md)
- [An empty success is not unfinished work](models/07-outcome-states.md)
- [Counting distinct skills instead of repeated tokens](models/08-normalized-sets.md)
- [A cursor needs the same order as the list](models/09-total-order.md)
- [Following prerequisites until a cycle becomes visible](models/10-graph-order.md)
- [One rejected shared operation must not block every future caller](models/11-promise-cleanup.md)
- [A response belongs to the request that produced it](models/12-request-scope.md)
- [A missing response is not proof of a missing effect](models/13-uncertain-retry.md)
- [A hidden button is not an authorization decision](models/14-trust-boundaries.md)
- [The same local ID can mean different records](models/15-scoped-lookup.md)
- [Two editors compete for one revision](models/16-conditional-write.md)
- [A late failure must undo earlier included writes](models/17-rollback-boundary.md)
- [A zero total can hide two invalid journals](models/18-grouped-invariants.md)
- [A fast answer to the wrong question](models/19-cache-identity.md)
- [Deletion does not cancel an already-running load](models/20-late-cache-fill.md)
- [A quota is not a long-term fairness proof](models/21-bounded-batches.md)
- [Row three finishing does not finish row two](models/22-contiguous-progress.md)
- [Late success after expiry needs a named policy](models/23-event-reconciliation.md)
- [A display countdown is not the inventory authority](models/24-clock-domains.md)
- [Averages must be weighted by what was counted](models/25-aggregation-denominators.md)
- [One repeated relevant item is not three independent hits](models/26-retrieval-metrics.md)

## Source map and evidence boundaries

- [packages/shared/src/query-keys.js](../../packages/shared/src/query-keys.js)
- [apps/web/src/lib/hooks.js](../../apps/web/src/lib/hooks.js)
- [apps/web/src/lib/api.js](../../apps/web/src/lib/api.js)
- [packages/shared/src/issue-schemas.js](../../packages/shared/src/issue-schemas.js)
- [learn/00-onramp.md](../../learn/00-onramp.md)

The actual boundary to investigate is shared schemas, API session handling, and cache/query ownership. Current source determines what the app does; a teaching model may introduce a simplified field, policy, or serialized execution order. Keep source reading, model execution, and application verification distinct. Human mastery remains unassessed until the learner produces their own explanation and evidence.

Return to the [all-project guided route](../../../opusorganize/junior-reinforcement/guided-04/README.md) for shared navigation and the measured content/preservation report.
