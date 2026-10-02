# Worked example: break the compare-and-swap (Exercise 1.1)

This is [EXERCISES.md](../../EXERCISES.md) exercise 1.1 performed once, for real,
with the actual output captured — a model of the loop every Tier 1 exercise
follows: **predict → break → observe → revert**. It is not a substitute for
doing it. Read "Predict first", write your own answers down, do your own run,
and only then read past the spoiler break to compare.

## Predict first

From exercise 1.1: remove `AND version=?` from the PATCH UPDATE in
`src/app.js` (and the matching bind argument). Before touching anything,
write down:

1. Which of the 12 API tests fail?
2. Does the two-process concurrency test fail every run, or only sometimes —
   and why is a sometimes-failing test the scarier result?
3. Why can't the UI conflict box alone preserve the guarantee?

---

**Spoiler break.** Everything below is the answer key. Do your own run first.

---

## The one-line break

In the PATCH handler (`src/app.js`, around line 277), the compare-and-swap
UPDATE loses its version predicate and the `expected` bind argument:

```diff
       const result = db.prepare(`UPDATE issues SET title=?,description=?,status=?,priority=?,assignee_id=?,version=version+1,updated_at=?
-        WHERE id=? AND version=? AND archived_at IS NULL`).run(fields.title, fields.description, fields.status, fields.priority, fields.assigneeId, now(), issueId, expected);
+        WHERE id=? AND archived_at IS NULL`).run(fields.title, fields.description, fields.status, fields.priority, fields.assigneeId, now(), issueId);
       if (result.changes !== 1) fail(409, 'VERSION_CONFLICT', ...
```

Everything else stays: the 409 code path, the comment above it, the version
increment. The server still starts and serves every request. Only the *meaning*
changed: the UPDATE now matches any live row, so `result.changes` is always 1
and the 409 is unreachable.

## What actually happened

`npm test` with the break in place (trimmed to the summary lines):

```
ok 5 - issue lifecycle persists comments and activity, and filtering treats search as literal text
not ok 6 - stale edits fail with current server state and cannot create an activity event
ok 7 - invalid values are rejected and owner membership rules preserve an owner
...
not ok 12 - two independent processes accept one versioned edit and survive a restart
# tests 12
# pass 10
# fail 2
```

**Test 6** (`tests/api.test.js:199`) is the invariant speaking in its purest
form — a stale PATCH that must be refused was accepted:

```
Expected values to be strictly equal:

200 !== 409
```

**Test 12** (`tests/concurrency.test.js:62`) races two separate server
processes against one database file with the same stale version:

```
both processes must use an atomic version predicate: [... "title":"Process A won" ... "version":2 ...
                                                      ... "title":"Process B won" ... "version":3 ...]
+ actual - expected
  [
    200,
+   200
-   409
  ]
```

Both writers claimed victory; "Process A won" was silently overwritten and the
row ended at version 3 after two "successful" edits of version 1 — the lost
update, caught red-handed.

**The determinism question.** I ran the broken suite twice; both runs failed
the same two tests the same way. That is *this break's* signature: the test
asserts the status *pair* `[200, 409]`, and with the predicate gone there is
never a 409, in any interleaving — so it fails every run. Contrast exercise
1.2 (`BEGIN IMMEDIATE` → `BEGIN`), where the bug only bites when two writers
actually collide in a window, and the suite can come up green on a lucky run.
A sometimes-green run is the scarier result: it passes CI, ships, and
corrupts data at whatever rate production traffic collides — a deterministic
red is a gift by comparison.

## Why no other layer saved us

- `npm run check` with the break in place: `Syntax checks passed for 15
  JavaScript files.` The code is perfectly well-formed; only its promise broke.
- The UI conflict box (`public/dialogs.js` — `showConflict()`) still exists,
  but it only fires on a 409, and the 409 path is now dead code: the server
  never reports a conflict it no longer detects.
- The client still faithfully sends the version it read; the server still
  increments `version`. All the ceremony survives — but the `WHERE ... AND
  version=?` predicate was the *only* place the check and the write were one
  atomic act. Remove it and every other layer is decoration.

## Restore and confirm

```
git checkout -- src/app.js
npm test
```

```
# tests 12
# pass 12
# fail 0
```

`git status --short src/` prints nothing — the tree is clean.

## Doing this yourself

```powershell
npm test                        # confirm 12/12 before you break anything
# edit src/app.js: remove "AND version=?" and the trailing "expected" bind
npm test                        # observe; run it twice, note what is stable
npm run check                   # see that syntax is not semantics
git checkout -- src/app.js      # revert
npm test                        # confirm 12/12 again
```

The rule: **never leave the break in place.** The suite is the teaching
instrument, not the victim — every exercise ends with a green run and a clean
`git status`, or you have not finished it.
