-- CreateEnum
CREATE TYPE "IndexArtifactStatus" AS ENUM ('BUILDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "index_artifacts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "IndexArtifactStatus" NOT NULL DEFAULT 'BUILDING',
    "storageKey" TEXT NOT NULL,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "bytesApprox" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "index_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "index_artifacts_docHash_key" ON "index_artifacts"("docHash");

-- CreateIndex
CREATE INDEX "index_artifacts_orgId_tenderId_idx" ON "index_artifacts"("orgId", "tenderId");

-- CreateIndex
CREATE INDEX "index_artifacts_status_idx" ON "index_artifacts"("status");

-- AddForeignKey
ALTER TABLE "index_artifacts" ADD CONSTRAINT "index_artifacts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "index_artifacts" ADD CONSTRAINT "index_artifacts_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
