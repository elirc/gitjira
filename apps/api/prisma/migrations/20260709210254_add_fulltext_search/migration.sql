-- Full-text search on Issue title + description.
--
-- LEARN: a `tsvector` is Postgres's pre-processed, searchable form of text —
-- words are stemmed ("running" -> "run") and stop-words ("the", "a") dropped,
-- so a search matches meaning, not exact characters. We make it a GENERATED
-- STORED column: Postgres recomputes it automatically whenever title or
-- description changes, so app code never maintains it (compare with the older
-- trigger approach — a generated column is the modern, less error-prone way).
--
-- setweight ranks title matches ('A') above description matches ('B'), so a
-- search for "login" surfaces issues titled "Login" before ones that merely
-- mention it in the body.
ALTER TABLE "Issue" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- LEARN: a GIN (Generalized Inverted Index) is the index type for "which
-- documents contain these words" — it maps each word to the rows containing it,
-- the inverse of a normal B-tree. It's what makes full-text search fast instead
-- of a full scan.
CREATE INDEX "Issue_searchVector_idx" ON "Issue" USING GIN ("searchVector");
