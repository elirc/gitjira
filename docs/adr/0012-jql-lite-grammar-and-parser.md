# 0012 — Hand-written JQL-lite (tokenizer + recursive-descent parser)

**Status:** accepted · **Sprint:** 06

## Context

Users want Jira-style queries (`type = bug AND assignee = me`). Options: a parser-generator
(PEG.js, nearley), a query-builder library, or a hand-written parser.

## Decision

A hand-written tokenizer + recursive-descent parser + compiler, in `packages/shared` so
client and server share the grammar. Subset only: `field OP value`, `AND`/`OR`, parens,
`me`, a field allowlist.

## Consequences

- ✅ Every step is readable, testable code a junior can follow — no generated black box.
- ✅ Shared grammar means the client can't accept a query the server rejects.
- ✅ Precedence, error positions, and the field allowlist are all under our control.
- ❌ We own the grammar's growth (OR-precedence, new operators) — but that's exactly the
  kind of change the structure makes localized.
- ❌ Not full JQL. Deliberately: ORDER BY, functions, and cross-field logic are parked.
- See `docs/concepts/parsing.md` for the three-step pipeline explained from scratch.
