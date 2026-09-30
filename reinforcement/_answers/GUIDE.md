# Sealed reasoning: GitJira

Read after writing your own attempt. This guide answers only the new reinforcement exercises; it does not disclose the existing incident solutions.

## Model solution

Check each structural segment. Filtered lists use an object at index 3; the selected detail uses the exact numeric issue number. Never select another project's keys or another detail merely because they contain the word issues. The implementation uses array filtering, so order and element references are preserved.

## App reasoning

Moving an issue from open to closed can change both filtered collections and the detail. The OTHER project is unaffected under this exercise's domain assumptions. Additional counters may matter in the app; derive them from the actual hook and response, not this model.

Invalidation marks cached data as needing refresh under library policy. It does not guarantee every observer instantly received fresh data. Tests should describe what the user sees and when, including inactive views becoming active again.

## Review standard

A mock asserting one invalidation call does not prove the key was correct or the user saw updated data. Global invalidation can conceal missing dependency reasoning and add work, while detail-only invalidation misses lists. Neither the model nor a cache test establishes that the database transaction committed correctly.

Keep server mutation success separate from refresh failure. The user may need a retry-read action and a stale-state indicator rather than another submission.

## Reference limits

`reference.mjs` implements the simplified contract in this pack. It is not a production patch or a recommendation to replace existing library behavior. The app transfer requires its own tests, source review, and runtime evidence.
