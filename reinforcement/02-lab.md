# Isolated lab: Select the affected issue-query keys

This is a small executable model, deliberately separate from the application. It uses Node's built-in test runner and has no package install, service, database, network call, or paid API dependency. It is JavaScript so you can focus on behavior first; the transfer task connects it back to this repository's JS/TS code.

## Contract

Implement `affectedKeys(keys, projectKey, issueNumber)`.

- Keys are arrays. A project issue key begins `['projects', projectKey, 'issues', ...]`.
- Return every matching project's key whose fourth element is a non-null, non-array object (a filtered list), or exactly the supplied numeric issueNumber (the detail).
- Preserve order, preserve each returned key reference, and do not mutate inputs. Ignore malformed/non-array keys, wrong projects, other resource families, and other issue numbers.
- This model does not implement TanStack Query matching, deduplication, recursive filters, or invalidation. It simply identifies affected entries from synthetic keys.

The app's actual query library remains the owner of cache semantics.

## Work sequence

1. Read `lab/contract-check.mjs`. Predict the output of two cases on paper before editing anything.
2. Run the command below. The checked-in starter throws `Not implemented`; this first failure is intentional.
3. Implement only `lab/exercise.mjs`. Keep the tests unchanged until the supplied contract passes.
4. Add one test from your own boundary case. Explain which plausible wrong implementation it rejects.
5. Change one line of your implementation to a plausible mistake and show a test turns red. Undo only that experimental change.
6. Write down the distinction between this pure model and the real app boundary. Continue to [transfer](03-transfer.md).

From this pack's directory:

```powershell
node --test lab/contract-check.mjs
```

Or from the repository root, use `reinforcement/lab/contract-check.mjs` in that command.
Node 22.16.0 was available during authoring; no dependencies are needed for these `.mjs` files.

## Debugging prompts

- If changing GJ invalidates OTHER, which segment did you omit?
- If only one filtered list is selected, have you confused the current filter with all affected views?
- If a list key is mistaken for a detail, inspect the fourth element's type.
- If a success toast becomes an error after refetch fails, which action actually failed?

## Completion evidence

Record the input, expected result, actual result, and the first place they diverge. A passing test with an assertion deleted does not count. Leave the app's source untouched while solving this lab.

After your attempt, compare [the reasoning guide](_answers/GUIDE.md). The separate reference implementation is checked with:

```powershell
node lab/contract-check.mjs --reference
```

That command exercises the answer, not your solution. It is for comparison after the attempt and for validating the teaching material.
