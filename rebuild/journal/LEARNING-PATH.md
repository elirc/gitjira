# GitJira Upskilling: Reading and Practice Path

Your central question: how do several people work on shared records without
silently losing each other's changes — and how do you *prove* they can't?

This is part one of the three-project course in
[CURRICULUM.md](../../CURRICULUM.md). [READ-ME-FIRST.txt](READ-ME-FIRST.txt)
remains the factual retrospective of the build; the learning layer around it
is [CODE-TOUR.md](../CODE-TOUR.md), [EXERCISES.md](../EXERCISES.md), this
clinic, the reconstructed [review diffs](diffs/backend-fixes.md), and one
[worked example](worked-examples/break-the-cas.md).

Suggested sequence, at your own pace:

1. **See it work.** Run the app (README), open one issue in two tabs, and
   create the conflict by hand. Read the retrospective for how the build
   actually went, including the test that was wrong.
2. **Trace one promise.** Take [CODE-TOUR.md](../CODE-TOUR.md) end to end with
   the files open. Then write the half-page tour for last-owner protection
   yourself (exercise 1.5) before reading anything else.
3. **Break it on purpose.** Exercises Tier 1. Do 1.1 yourself first, then
   compare your run against the
   [worked example](worked-examples/break-the-cas.md) — the point of the model
   run is calibrating how you observe and report, not spoiling the prediction.
   Read clinic sections 1-3 alongside.
4. **Study the review record.** [diffs/backend-fixes.md](diffs/backend-fixes.md)
   with the findings in [reviews/04-astra-backend.md](reviews/04-astra-backend.md):
   input, observed result, violated promise. That anatomy is the standard for
   every review you give or accept later.
5. **Extend inside the boundaries.** Two or more Tier 2 exercises, tests
   first. Clinic sections 4-7 are the design background. Keep the three
   verification commands green throughout.
6. **Move a boundary.** One Tier 3 exercise, one page of design first (two
   alternatives and what evidence would change your mind), then build under
   the existing acceptance suites. Clinic sections 8-9 frame the two most
   common choices.

Concrete outputs to keep in your learning journal:

- A table of this system's identities, lifetimes, and reuse semantics
  (clinic section 1 is the model).
- Your own last-owner code tour.
- One break-the-guarantee report in the worked example's format: predict,
  one-line diff, real output, which layer spoke, restore.
- One review you wrote with a concrete counterexample, and the test it became.

Labels: "implemented" refers to this local edition, not production scope;
"exercise" means the code does not contain it yet; actual evidence lives in
[VERIFICATION.md](VERIFICATION.md) and [evidence/](evidence/), which later
additions never rewrite.

When you finish, go to [Stockade](../../stockade-rebuild/README.md). GitJira's
question was about losing *edits*; Stockade's is about promising the same
*physical unit* twice — the same compare-and-swap idea, pointed at inventory,
plus request identity that must survive lost responses and shared cookies.
