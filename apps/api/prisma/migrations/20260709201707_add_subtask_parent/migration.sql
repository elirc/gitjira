-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
