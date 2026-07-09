# 0010 — Plain-text descriptions and comments for v1

**Status:** accepted · **Sprint:** 05

## Context

Jira has rich-text everything. The original plan was TipTap JSON descriptions. But rich
text pulls in @mentions (which need the notification pipeline, sprint 09), sanitization
(a security surface, sprint 13), and an editor dependency.

## Decision

v1 ships plain-text descriptions and comments stored as strings. Rich text is deferred.

## Consequences

- ✅ v0.1.0 ships now with a clean, testable data shape (a string).
- ✅ No premature security surface: no HTML to sanitize, no mention-parsing.
- ❌ No formatting or @mentions yet — a visible gap vs Jira. Tracked; @mentions arrive with
  the notification pipeline they depend on (sprint 09).
- Note: the description field is a plain column, so a later migration to structured content
  is additive, not a rewrite.
