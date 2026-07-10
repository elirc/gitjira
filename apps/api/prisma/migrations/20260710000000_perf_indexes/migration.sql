-- Composite index: board list filters projectId, orders createdAt DESC, id DESC.
-- Serves filter + sort in one index walk (removes the top-N heapsort).
CREATE INDEX "Issue_projectId_createdAt_id_idx" ON "Issue"("projectId", "createdAt" DESC, "id" DESC);

-- Composite index: activity feed reads one issue's events newest-first.
CREATE INDEX "ActivityEvent_issueId_createdAt_idx" ON "ActivityEvent"("issueId", "createdAt" DESC);
