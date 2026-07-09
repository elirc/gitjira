# Sprint 06 — Search, Filtering & JQL-lite · Learning brief

**Levels:** L2, L3, L5 · **PR:** #57 · **Release:** v0.2.0

## What this sprint teaches

1. **Building a small language** — tokenizer → parser → compiler, hand-written. The
   headline skill; read `docs/concepts/parsing.md` first, then the code.
2. **Precedence** — why `orExpr` calls `andExpr`, and what breaks when it's wrong (review finding).
3. **Postgres full-text search** — tsvector + GIN, generated columns, `EXPLAIN` (ADR 0013).
4. **Frontend responsiveness** — debounce + AbortSignal to keep a search box fast and correct.
5. **Deleting replaced code** — the client filter dies; one path beats two.

## Read the PR in this order

`packages/shared/src/jql/tokenizer.js` → `parser.js` (read the grammar comment, then the
code) → `compiler.js` (the field allowlist) → the JQL tests + fuzz test → the FTS migration
→ `search.service.js` → **the review threads** (the AND/OR precedence bug and the raw-SQL
interpolation) → the web search bar + Cmd+K palette.

## Exercises

1. Add `OR` + parentheses cases to the parser tests, tests-first.
2. Add relative-date syntax `updated >= -7d` to the tokenizer, parser, and compiler.
3. Break `keyBetween`… no — break the tokenizer's operator ordering (put `=` before `!=`)
   and read which test fails and why.

<details><summary>Hints</summary>

1. The parser already handles OR and parens — you're asserting the tree shape.
2. Three files change; the compiler turns `-7d` into a date cutoff.
3. The `!= as one token` test is your canary.

</details>
