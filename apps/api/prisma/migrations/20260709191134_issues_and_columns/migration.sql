-- CreateEnum
CREATE TYPE "ColumnCategory" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "issueCounter" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WorkflowColumn" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "category" "ColumnCategory" NOT NULL,

    CONSTRAINT "WorkflowColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "IssueType" NOT NULL DEFAULT 'TASK',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "columnId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "reporterId" TEXT NOT NULL,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowColumn_projectId_idx" ON "WorkflowColumn"("projectId");

-- CreateIndex
CREATE INDEX "Issue_projectId_columnId_idx" ON "Issue"("projectId", "columnId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_projectId_number_key" ON "Issue"("projectId", "number");

-- AddForeignKey
ALTER TABLE "WorkflowColumn" ADD CONSTRAINT "WorkflowColumn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "WorkflowColumn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
