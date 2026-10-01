# Reconstructed diffs: the three backend fixes

**Provenance note.** The build did not preserve pre-fix source snapshots, so
these diffs are **reconstructions**: the post-fix side is the real code, and
the pre-fix side is rebuilt from the observed behavior recorded in
[reviews/04-astra-backend.md](../reviews/04-astra-backend.md) (which quotes the
inputs, status codes, and line ranges of the version it reviewed). They exist
so a learner can study each finding as a reviewable change — read the finding,
cover the diff, write the fix you would make, then compare. The exact pre-fix
spelling may have differed; the behavior did not.

Line numbers here refer to the code as reviewed on 2026-10-01; the current
`src/app.js` has since gained comments, so positions have shifted.

---

## Fix 1 — Reject embedded NUL in text (finding §1, P2)

**Observed before:** `POST /api/projects/1/issues` with
`{"title": "hello\u0000there"}` → **201**, but the stored/returned title was
`"hello"`; a *leading* NUL produced a **500**. The product accepted data it
could not round-trip.

```diff
 function text(value, name, max, required = false) {
-  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
+  if (typeof value !== 'string' || value.includes('\u0000') || value.length > max || (required && !value.trim()))
     fail(400, 'VALIDATION', `${name} must be ${required ? 'non-empty text' : 'text'} up to ${max} characters.`);
   return value.trim();
 }
```

**Why here:** the shared validator guards titles, descriptions, names, and
comment bodies in one place, so one line fixes every text field. Rejecting with
400 *before* storage keeps the contract honest: nothing is accepted that cannot
be returned intact.

**Regression tests:** `tests/api.test.js` — "escaped 10,000-character
descriptions round-trip while NUL text and nonprimitive IDs fail validation"
(internal and leading NUL both asserted).

---

## Fix 2 — Validate ID type before coercion (finding §2, P3)

**Observed before:** `POST /api/session` with `{"userId": [1]}` → **200** as
Avery (`String([1])` is `"1"`); `{"userId": {"toString": 1}}` → **500**
(coercion invoked the malformed property). Arrays and objects reached
`String()`/`Number()` directly.

```diff
 function id(value, name = 'ID') {
-  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)
+  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)
     fail(400, 'VALIDATION', `${name} must be a positive integer.`);
   return Number(value);
 }
```

**Why here:** the type check runs before any conversion method on the value can
execute. Digit **strings** stay valid on purpose — route and query parameters
arrive as strings. Not a privilege escalation in a deliberately passwordless
demo, but a broken input contract (integer IDs, invalid ⇒ 400) is a bug
regardless of exploitability.

**Regression tests:** same test as fix 1 (array ID and malformed-toString
object both asserted as 400).

---

## Fix 3 — Size the parser for the largest valid payload (finding §3, P3)

**Observed before:** a valid 10,000-character description written as JSON
escapes (`a` × 10,000 ≈ 60 KB on the wire) → **413 TOO_LARGE** before
field validation ever ran. The field validator said 10,000 characters are
valid; the transport said they are not.

```diff
-  app.use(express.json({ limit: '32kb', strict: true }));
+  // JSON escaping can use six bytes per character; preserve the documented text limits.
+  app.use(express.json({ limit: '128kb', strict: true }));
```

**Why 128 KB:** the largest permitted field is 10,000 characters; worst-case
JSON escaping is six bytes per character (~60 KB) plus the rest of the body.
128 KB bounds the request while guaranteeing every contract-valid payload
fits. The alternative — narrowing the contract's byte size — was legitimate
too; the review offered both, and the builder chose to honor the documented
character limits.

**Regression tests:** same test file — a maximum-length escaped description
round-trips (200), and a body above the new cap is rejected (413).

---

## What to take from these as a learner

Each finding has the same anatomy: **a specific input, an observed result, and
a violated promise.** None of them says "improve validation." That is the
standard to hold your own reviews to — and the standard to demand of a
reviewing agent (see [EXERCISES.md](../../EXERCISES.md)).

The frontend race fixes (request tokens, pending-write locks, the
account-switch recovery screen) have no reconstructed diffs because they were
iterative rewrites rather than line edits; their before/after behavior is
recorded step by step in [reviews/05-sol-ui-review.md](../reviews/05-sol-ui-review.md),
including the one browser-reproduced pre-fix failure.
