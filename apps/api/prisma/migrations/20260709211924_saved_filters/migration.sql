-- NOTE: Prisma's diff for this migration tried to "correct" the generated
-- tsvector column (DROP DEFAULT) and drop its GIN index, because Prisma treats
-- Unsupported("tsvector") columns as opaque. Those statements were invalid
-- (you can't DROP DEFAULT on a GENERATED column) and are removed by hand — a
-- known Prisma limitation with generated columns. The only real change here is
-- the SavedFilter table.

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jql" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedFilter_userId_idx" ON "SavedFilter"("userId");

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
