# 0013 — Postgres full-text search, not Elasticsearch

**Status:** accepted · **Sprint:** 06

## Context

Free-text search over issue titles + descriptions. The reflexive answer is "add
Elasticsearch/OpenSearch." We already run Postgres.

## Decision

Use Postgres's built-in full-text search: a generated `tsvector` column + GIN index,
queried with `websearch_to_tsquery`.

## Consequences

- ✅ Zero new infrastructure — no second datastore to run, secure, back up, and keep in
  sync with the source of truth.
- ✅ Search results are always consistent with the database (same transaction), with no
  indexing lag.
- ✅ Good enough at our scale (thousands to low millions of rows) with ranking (`ts_rank`)
  and stemming.
- ❌ Not as powerful as a dedicated engine (typo tolerance, complex relevance tuning,
  massive scale). The trigger to revisit is real: if search quality or scale outgrows
  Postgres FTS, Elasticsearch becomes worth its operational cost — but not before.
