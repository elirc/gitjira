-- Hand-written (Prisma's auto-diff fights the generated tsvector column). Only
-- the sprint changes are here.

-- CreateEnum
CREATE TYPE "SprintState" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "state" "SprintState" NOT NULL DEFAULT 'PLANNED',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sprint_projectId_idx" ON "Sprint"("projectId");

-- LEARN: a PARTIAL unique index — uniqueness only applies WHERE the condition
-- holds. Here: at most one ACTIVE sprint per project, but any number of PLANNED
-- or COMPLETED ones. This is the database enforcing the "one active sprint"
-- rule as a hard invariant. An app-side check ("is there already an active
-- one?") is a lie under concurrency — two requests can both read "no" and both
-- start. The DB constraint is the truth; the service catches the violation and
-- turns it into a clean 409. (Same lesson as the sprint-03 key counter.)
CREATE UNIQUE INDEX "Sprint_one_active_per_project"
  ON "Sprint"("projectId")
  WHERE "state" = 'ACTIVE';

-- AlterTable: issues can belong to a sprint and carry story points
ALTER TABLE "Issue" ADD COLUMN "sprintId" TEXT;
ALTER TABLE "Issue" ADD COLUMN "storyPoints" INTEGER;

-- AddForeignKey: SetNull so deleting a sprint doesn't delete its issues —
-- they fall back to the backlog.
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_sprintId_fkey"
  FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Issue_sprintId_idx" ON "Issue"("sprintId");
