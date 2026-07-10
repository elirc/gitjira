# Engineering Workflow — Improvements for Future Rounds

A forward-looking playbook distilled from an honest audit of the work so far.
Everything here is a **thing to do or add in future projects** so the git history
becomes a more complete and more trustworthy textbook. Cross-project: applies to
gitjira, tracer, and every future build. Re-audit against this after each round.

---

## 1. Process integrity — make the history tell the truth

- **Run the pre-commit hooks; never bypass them.** If husky/lint-staged/commitlint
  are installed, let them run on every commit. The value for a learner is that the
  history then reflects _real_ local discipline — format/lint/type errors never
  reach CI, so there are no "oops, fix lint" follow-up commits polluting the story.
  If a hook is genuinely wrong, fix the hook in its own commit; don't disable it.
- **Keep local == CI.** Whatever CI runs (lint, format check, typecheck, tests,
  build), make it runnable and green locally _before_ pushing. Push to confirm,
  not to discover. A clean first-push-green streak is itself a senior signal.
- **Proofread commit messages.** Write them in the editor or from a file, and read
  them back before committing. Never pipe messages containing backticks or `$`
  through a shell in a way that can silently drop words — the commit message is a
  primary teaching surface and must be exact.
- **One concern per commit, and say why in the body.** Keep the excellent
  granularity, and keep the rich bodies (the _why_, the trade-off, the gotcha,
  measured before/after). This is already the strongest asset — protect it.

## 2. Only claim "done" for work that actually ran

- **A feature is done when it executed, not when it compiled.** Before a PR says a
  thing works, run it: start the container, hit the endpoint, run the E2E, execute
  the migration, build the image.
- **Label unverified work explicitly.** When something genuinely can't run in the
  environment (a cloud deploy, a paid service), mark it **`UNVERIFIED — config
only`** in the PR and the doc, rather than narrating it as complete. A learner
  must be able to tell "I ran this and here's the output" from "this is the code I
  would run."
- **Attach evidence.** Give every PR a short **Verification** section: the exact
  commands run and their real output (test summary, EXPLAIN plan, coverage number,
  `docker inspect` result, tool logs). Measured numbers only; if a number is an
  estimate, say "estimated."

## 3. Make review honest — either real, or labelled

- **If it's single-author, call it what it is:** an **"Author self-review
  checklist."** Self-review is a genuine senior practice; presenting it as peer
  review teaches the wrong thing about how review actually feels.
- **Introduce a genuine second perspective when possible** — a reviewer with
  different context (a separate pass with fresh eyes, a different model/agent, or a
  later-in-time re-read), so the review can contain real friction: a reviewer who
  misreads the code, a disagreement that _doesn't_ resolve cleanly, a suggestion
  the author declines with reasons.
- **Keep the planted-bug device, but be transparent about it.** Note in the PR that
  a bug was deliberately seeded as a teaching exercise, so a learner doesn't
  conclude that real reviewers reliably catch everything on the first pass.

## 4. Show the messy middle, not just the clean destination

- **Leave the thrash in.** When an approach is rewritten two or three times (like
  the fractional-index algorithm was), capture it: a spike branch with the failed
  attempts, or a commit/ADR that records "attempt 1 failed because X, attempt 2
  because Y." The wrong turns are where a lot of the learning lives.
- **Narrate at least one genuinely hard debugging session per project** — a
  confusing symptom with no obvious cause, hypotheses formed and killed, `git
bisect`, added logging, the dead ends kept in. This is the single most valuable
  senior skill and it has been absent; make it a first-class showcase.

## 5. Add the senior skills that have been missing

Each of these should appear _for real_ (executed and evidenced) in future rounds:

- **A real debugging investigation** (see §4) — the marquee addition.
- **A real incident + blameless post-mortem** based on a failure you actually
  induce and diagnose live (kill a dependency, corrupt data, exhaust a pool), with
  the real timeline — not a narrated fiction.
- **A real dependency upgrade** — bump something with a breaking change, read the
  changelog, fix the fallout, and run the actual `gitleaks` / `npm audit` /
  `semgrep` with their real output committed.
- **Real profiling beyond the database** — a CPU flamegraph, a memory-leak hunt, GC
  or event-loop analysis — not only query counts.
- **Load / stress testing actually executed** (autocannon/k6) with the real
  p50/p95/p99 under concurrency, not just per-query timings.
- **A real deploy and a real rollback** — even locally against the prod-parity
  compose stack — timed and evidenced, so numbers like "rollback took N seconds"
  are measured.
- **Accessibility verified with a real tool run** — at minimum the axe CLI output,
  ideally a screen-reader transcript — attached as evidence.
- **Observability used to find something** — induce a regression and show it being
  diagnosed from `/metrics` or a dashboard, closing the loop from "we have metrics"
  to "the metrics caught a real problem."
- **Mutation testing actually run** (Stryker) with an analysis of which mutants
  survived and what that says about test quality.

## 6. Realism of pace and workflow

- **Let CI be a gate, not a cleanup step.** Push, wait for CI, respond to CI — model
  the real rhythm rather than a burst that hides it.
- **Model iteration where it teaches.** A short "I changed my mind after seeing X"
  cycle is more instructive than an always-right first draft.

## 7. Cross-project meta-practices to add

- **A "skills demonstrated" ledger.** Maintain a running table mapping each PR to
  the specific senior skill it showcases. Gaps become visible immediately (this
  audit exists because there was no such ledger).
- **A periodic honest self-audit, committed.** Repeat an audit like the one that
  produced this doc at the end of each project, and commit it — so the learner can
  _diff_ the trajectory and see the workflow itself improving over time.
- **Keep the ADRs, state snapshots, concept docs, and glossary** — those are
  working well. The improvements above are additions and corrections, not
  replacements.

---

### Priority order (if only a few things change next round)

1. Stop bypassing hooks; keep local == CI (§1).
2. Only claim "done" for work that ran; attach verification evidence (§2).
3. Add one real, hard debugging session with the false starts left in (§4).
4. Label the review honestly (§3).
5. Add one previously-missing senior skill, executed for real (§5).
