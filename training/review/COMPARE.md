# Compare your review with the model review

Fill this in after `MY_REVIEW.md`. Compare it against **two** references:

- (A) `training/_answers/review.md`: the model review (R1–R29).
- (B) the repo's own self-assessment: `docs/process/AUDIT-2026-07.md`, `docs/security-audit.md`, `docs/threat-model.md`, `docs/RUNBOOK.md`.

B is honest about the process (fabricated drill, bypassed hooks), but it misses most of the runtime findings in A. Part of the exercise is explaining why a thorough-looking self-audit can miss them.

## 1. Scoreboard

|                      | Critical | High | Medium | Low |
| -------------------- | -------- | ---- | ------ | --- |
| Found by me          |          |      |        |     |
| In A                 |          |      |        |     |
| Found by me and in A |          |      |        |     |

## 2. Findings I missed (A ids, e.g. R3, R7)

| id  | Why I missed it: didn't open the file / read it but didn't see the failure / saw it but misjudged severity / didn't know the concept / trusted a doc |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
|     |                                                                                                                                                      |

## 3. Findings I had that A doesn't

Are they real? Prove each one with a `path:line` and a concrete scenario, or withdraw it.

## 4. Where the docs and the code disagree

Pick two claims from B or the `// LEARN:` comments that A shows to be false (for example, the RUNBOOK's "the api degrades gracefully" when Redis is down). For each, write the claim, the code that contradicts it, and how you would have verified it in 10 minutes.

## 5. The pattern behind my misses

Mark the ones that apply, then write one sentence on what you'll do differently next review:

- I reviewed one process, and didn't ask "what changes with two machines, a deploy, or a reconnect?"
- I trusted ADRs, the runbook or comments instead of reading the code path
- I checked that a feature exists but not that it's **wired** (no callers, no emitter, no deploy target)
- I didn't open config (`fly.toml`, workflows, Dockerfiles) as production code
- I didn't ask what the test harness **can't** see
- I read the backend carefully and skimmed the React code
- Other: ...

## 6. Severity calibration

Pick one finding where your severity differed from A's by two or more levels. Argue your position in three sentences, then say whether you'd change it.
