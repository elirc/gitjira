# 25. Design a recoverable command receipt

The capstone proposes a command receipt for issue creation and sprint completion. This is new design work, not an implemented feature. It connects optimistic concurrency, transaction retries, durable history and lost-response recovery. Choose one command for a full design and use the other as a transfer check.

## Define command identity

A receipt should identify a specific user intent under a scope such as actor, project and client-generated command key. Decide which payload fields define equivalence. For sprint completion, source sprint and destination matter. For issue creation, title, type, parent, column and other supplied fields may matter under the chosen contract. Canonicalization must preserve distinctions such as omitted versus explicitly null where those affect meaning.

Reusing a command key with equivalent intent can return the recorded result. Reusing it with changed intent should produce an explicit conflict under a common design. Do not silently return an earlier result for a different destination or issue body. The receipt is a business contract, not merely a cache keyed by a random string.

## Atomic recording

The command's durable mutation and completed receipt should commit together. If the mutation commits without the receipt, a lost response can still lead to repetition. If the receipt commits without the mutation, a retry can falsely report success. The local transaction should encompass the appropriate rows and result identity.

An in-progress receipt can coordinate concurrent requests, but it needs a crash-recovery policy. A state called PROCESSING is not self-healing. Define ownership, attempt identity, timeout interpretation and how another request learns whether work committed. For a command entirely inside one database transaction, the design can often be simpler than an external-side-effect workflow. Do not import unnecessary distributed machinery without identifying a real boundary.

## Interaction with serializable retries

The transaction callback may execute more than once. Receipt creation, mutation and result recording should tolerate those retries under the chosen database contract. External notifications remain outside the retryable side-effect path or become durable outbox intents in the same transaction. The command key should remain stable across internal retries; generating a new key in each callback defeats association.

If the third recognized serialization conflict is exhausted, define whether a receipt exists and what a later client retry does. Avoid leaving a durable receipt that says success when the transaction never committed. A failure receipt can be useful, but it must distinguish retriable infrastructure conflict from a permanent business rejection if the product wants different behavior.

## Lost response recovery

After commit, the response can be lost. The client resubmits the same command key or queries the receipt. The server returns the original result identity without performing the mutation again. For completion, that result may include movedCount and completion record ID. For creation, it includes the issue ID and project number.

The result may describe what the command did even if later commands changed current state. A created issue can later be reassigned; a completed sprint's moved issue can later join another sprint. The receipt should not be confused with a live detail snapshot. A response can include both original command result and a link or identifier for a current read under authorization.

## Retention and authority

Define how long receipts remain available and what happens after expiration. Removing a receipt can remove the ability to distinguish an old retry from a new command. A retention policy should match client retry windows and operational recovery needs. Do not claim eternal idempotency if keys are eventually forgotten.

Every receipt read must enforce project and actor visibility according to the product policy. Possessing a random command key should not automatically reveal another project's issue data. Consider whether administrators may inspect receipts for support and how that access is audited. Keep secrets and full private payloads out of general logs.

## Required tests

Include concurrent equivalent commands, concurrent changed-payload reuse, transaction rollback, internal serialization retries, lost response after commit, expired receipt behavior and unauthorized receipt lookup. For each, assert mutation count and returned identity. A passing design should create one issue or one completion result for equivalent retries under its supported retention and scope.

Submit schema, state diagram, canonicalization examples, failure table and client recovery flow. Full credit requires a concrete definition of equivalence and a clear separation between original command result and current mutable resource state.

[Index](README.md) · [Review notes](answers/12-incidents-and-capstone.md)
