# 28. Measure one bottleneck at a time

GitJira's source contains historical performance notes about query counts, payload projection and bounded history. Those notes explain intent, but a new engineering report needs fresh measurements for the current code and environment. This workshop designs a small benchmark campaign that preserves correctness and makes its limitations clear.

## Choose a user action

Select one action: load an issue detail, open the backlog, move a card or complete a sprint with many unfinished issues. Define the dataset shape that makes the action representative. For detail, vary comments and activity independently. For backlog, exceed one page. For completion, include done and unfinished issues. For moves, include several cached views and a realistic number of cards.

Measure end-to-end latency and useful components separately where possible. Database query duration, query count, serialized bytes and browser rendering time are different costs. A change that reduces query count can increase returned rows; a smaller payload can require an extra detail request. Record the tradeoff rather than selecting one favorable metric.

## Control the experiment

Use a disposable seeded environment with fixed data and no external recipients. Warm and cold cache runs should be labeled separately. Record whether the membership cache uses memory, Redis or is disabled. Record whether the notification queue is bypassed. Those settings can materially change the measured path.

Repeat enough runs to observe variation, but do not turn repetition into a substitute for experimental design. Exclude setup time only if you state that choice. Keep failures in a separate outcome table rather than silently discarding slow or rejected requests. A completion race that returns conflict is a different outcome from a successful completion and should not be averaged indiscriminately.

## Preserve the invariant tests

Before and after an optimization, run the focused correctness checks for the changed boundary. A set-based issue move must still leave done issues in place and roll back on failure. A cache optimization must not resurrect stale authority. A projection change must retain the version token needed by the client. Performance work is useful only if the behavior remains the intended one.

Design a benchmark for replacing a per-row operation with a batch operation. Include an injected failure after an earlier local statement to check atomicity. Include a dataset with zero, one and many affected issues. Measure both successful work and rejected destinations, because early validation can affect perceived responsiveness.

## Interpret results cautiously

A local benchmark can establish a relative difference under its fixture. It cannot promise the same latency in every deployment. CPU, database configuration, network, cache topology and concurrent workload can change the result. State the environment and avoid turning a single median into a universal service-level objective.

If a proposed optimization changes consistency, document that as a product decision. Serving a stale aggregate faster may be acceptable if labeled and refreshed, but it is not equivalent to a fresh authoritative count. Removing authorization reads for speed would require a different validated authority contract, not simply a favorable chart.

## Report template exercise

Write a report containing question, fixture, environment, baseline, proposed change, measurements, correctness checks and remaining limits. Include one result that did not improve and explain why. The report should help a reviewer decide whether the change solves the measured problem without hiding costs elsewhere.

The workshop passes when the learner can connect each metric to a user-visible outcome and each optimization to an invariant that must survive. Avoid historical numbers unless explicitly labeled as historical source comments. Fresh evidence should stand on its own.

[Index](README.md) · [Review notes](answers/13-final-workshop.md)
