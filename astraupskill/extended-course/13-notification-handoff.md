# 13. Awaited enqueue is still part of the response path

Issue creation and assignee updates perform notification-related work after the database transaction. [The queue module](../../apps/api/src/jobs/queue.js) lazily constructs a BullMQ queue and awaits add when enqueueNotification is called, unless DISABLE_QUEUE is set. The eventual fan-out happens in a worker, but queue submission itself is awaited before the service returns. Read comments about “off the request path” with that distinction in mind.

## Three outcomes for one command

First, the issue transaction can fail before committing, in which case postcommit notification work is not reached. Second, the issue can commit and enqueue can succeed, after which the worker may later succeed or fail. Third, the issue can commit and enqueue can fail, causing an outward error while durable issue state already changed. These outcomes require different recovery behavior.

Use a fake queue that rejects after the transaction returns. Assert the issue's durable assignee and activity record, then inspect the outward error. A client that repeats the original command may record another activity or trigger another notification attempt depending on the service logic. Define whether the command has a stable identity and whether repeating it is intended to recover notification delivery or mutate the issue again.

## Durable intent versus delivery

A proposed outbox stores notification intent in the same transaction as the issue change. A worker then reads that intent and submits or performs delivery. This closes the gap where the issue commits but no durable notification intent exists. It does not automatically make notification delivery exactly once. The worker can deliver successfully and fail before marking the outbox row complete.

Specify an event identity and recipient identity for deduplication. If one event fans out to several recipients, a single event-level completion flag may be too coarse to recover partial delivery. A receipt per recipient can record which deliveries completed. The appropriate granularity depends on the notification channel and user experience.

## Retry configuration as code

The queue's default job options specify five attempts and exponential backoff with an initial delay value, retain failed jobs and keep a bounded number of completed jobs. This course reports the local configuration, not every runtime behavior of a particular BullMQ version. If implementing a change, verify the installed library's current contract through its package and official documentation as needed.

For a local learning model, define an explicit sequence of attempt outcomes and calculate when the policy stops. Distinguish total attempts from retries after the first attempt. A failed-job record is useful only if operators can identify the cause, determine whether partial work occurred and replay safely. Retaining failures without a recovery contract creates a backlog of uncertainty.

## DISABLE_QUEUE changes evidence

Tests can set DISABLE_QUEUE to bypass submission. Such a test may verify issue state and activity behavior while providing no evidence about enqueue success, queue connectivity or worker fan-out. A report should not say notification delivery passed merely because the API test passed with the queue disabled.

Design separate tests for service handoff, queue adapter configuration and worker idempotency. Use synthetic recipients and no real outbound messages. The service test can inject a fake enqueue function; the worker test can use a fake delivery port. A bounded integration test with a disposable queue can examine serialization and retry behavior without involving external recipients.

## Observability exercise

Propose counters for committed issue changes, durable notification intents, enqueued jobs, attempted deliveries, successful recipient receipts and permanently failed jobs. These are different populations. A dashboard that divides successful deliveries by API requests can be misleading when some commands have no recipients or fan out to many recipients.

Create a synthetic incident with one issue assignment, three recipients, two successful deliveries and one ambiguous delivery. Write the recovery decision for each recipient. Do not resend to all three simply because the overall job failed unless the delivery contract makes that safe. The exercise transfers the publication course's external-boundary reasoning into GitJira's notification workflow.

## Deliverable

Submit the transaction/handoff diagram, fake failure test, proposed outbox schema and recipient recovery table. A strong answer distinguishes asynchronous processing from an unawaited call and identifies exactly where the current response can fail after commit. It should preserve the user's issue change while providing a separate path to recover delivery.

[Index](README.md) · [Review notes](answers/07-events-and-order.md)
