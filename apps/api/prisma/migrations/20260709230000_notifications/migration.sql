-- Watchers and notifications (hand-written; Prisma's diff fights the generated
-- tsvector column).

CREATE TABLE "Watcher" (
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Watcher_pkey" PRIMARY KEY ("issueId", "userId")
);
CREATE INDEX "Watcher_userId_idx" ON "Watcher"("userId");
ALTER TABLE "Watcher" ADD CONSTRAINT "Watcher_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watcher" ADD CONSTRAINT "Watcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "issueId" TEXT,
    "actorId" TEXT,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
-- LEARN: the UNIQUE on dedupeKey is what makes at-least-once delivery safe. A
-- retried job inserting the same (recipient, event) key hits this constraint,
-- and the handler treats that as "already delivered" instead of a duplicate.
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
