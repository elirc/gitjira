# Review notes: incidents, mutations and receipts

Dossier A is consistent with assignment followed by completion; success does not freeze future state. Dossier B contains both a stale cache resurrection race and a separate authority-timing question. Dossier C exposes ordering among immutable snapshots. Dossier D shows that unique issue numbering does not deduplicate repeated user intent after a postcommit failure.

Each needs a different repair. Completion history explains later movement. Cache generations can prevent stale stores under their defined scope. Optimistic mutation identity can prevent inappropriate rollback. A command receipt can recover creation without repeating it. Broad cache resets or unconditional retries do not address all four causes safely.

Mutation tests should reach the targeted guard while satisfying other preconditions. Removing a version predicate requires a two-reader schedule to expose the gap. Omitting unfinished movement requires final-row assertions. Applying create defaults to PATCH requires exact parsed-output checks. Removing ownership validation requires a valid foreign-project object, not a malformed identifier that fails earlier.

The command receipt must define scope, payload equivalence, retention and authority. It should commit consistently with the mutation and return the original result identity after a lost response. That result is historical command evidence, not necessarily current resource state. Internal retries should reuse the same command identity and avoid repeating external side effects.

For conflict communication, preserve attempted intent and distinguish known rejection from unknown network outcome. Automatic replacement of a stale token defeats user review. A foreign destination should not be explained with unauthorized project details. A good recovery panel makes the next valid action explicit and testable.

[Index](../README.md)
