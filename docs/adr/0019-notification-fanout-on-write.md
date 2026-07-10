# 0019 — Fan-out notifications on write, with idempotent handlers

**Status:** accepted · **Sprint:** 09

## Context

When an event happens, who gets notified, and when do we compute that? Fan-out-on-write
(compute recipients and create rows when the event happens) vs fan-out-on-read (compute each
user's feed when they open it).

## Decision

Fan-out on write, in a worker job. Recipients = assignee + watchers + @mentioned, deduped.
Each notification row carries a UNIQUE `dedupeKey` derived from the event + recipient, so a
redelivered job can't duplicate.

## Consequences

- ✅ Reads are trivial (SELECT your notifications); the work is done once, in the background.
- ✅ Idempotency is enforced by the database, not hoped for.
- ❌ Fan-out cost scales with recipients per event (the "celebrity problem" at extreme scale;
  irrelevant for team-sized projects — documented threshold, not a today problem).
- ❌ The handler must catch the unique-violation and treat it as delivered — forgetting that
  is the planted review finding.
