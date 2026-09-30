# Lab A: Apply a precise issue PATCH

Practice property presence without conflating omission, zero, null, and invalid data.

## Exact teaching contract

Export `applyIssuePatch(issue, patch)`. The existing synthetic issue is valid. Patch is a plain object with own fields drawn only from title, assigneeId, storyPoints. Reject unknown keys with TypeError. Present title must be a string whose trimmed value is nonempty; store the trim. Present assigneeId must be null or a nonempty string (store unchanged). Present storyPoints must be null or an integer 0–100. Present undefined is invalid. Return a new issue object, preserving every omitted field and not mutating input. This model is not the actual Zod schema.

## Work the examples before the implementation

Start with title Old, assignee U7, points 8. Predict title-only, assignee null, points 0, points null, and empty patch. Identify why `{...defaults,...patch}` breaks one of those cases.

Read `check.mjs`, write expected results for two cases, and then run it. The starter deliberately throws `Not implemented`. Implement `exercise.mjs` yourself and keep the supplied assertions unchanged. Add one test for an edge that is not already asserted, then demonstrate a plausible wrong implementation fails it.

From this lab directory:

```powershell
node --test check.mjs
```

The file is explicitly named `check.mjs` rather than a test/spec filename so conventional app test discovery does not collect an unfinished teaching exercise. There is no npm install, database, network, paid model, or payment call. These are small JavaScript models; types and application integration are separate practice tasks.

## Connect the model to the application

Compare with updateIssueSchema and a real edit mutation. Assert stored untouched fields after an HTTP PATCH; do not stop at the parser unit test.

Record what is simplified: input validation already assumed, event ordering promised by the caller, a missing persistence layer, or an injected clock. A passing model is useful only when you can name the guarantee the real app still needs.

After your own attempt, read [the reasoning guide](../../_answers/GUIDE.md). The separate reference is checked with:

```powershell
node check.mjs --reference
```

This second command verifies the author's answer, not your solution. If your solution differs but meets every stated contract, compare invariants and failure cases instead of matching lines. Save the failing output, corrected output, your extra assertion, and a short explanation of why the correction is sufficient for this model.
