-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'SUMMARIZING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "hasText" BOOLEAN NOT NULL DEFAULT true,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sections" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "heading" TEXT,
    "text" TEXT NOT NULL,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_summaries" (
    "documentId" TEXT NOT NULL,
    "abstract" TEXT,
    "sectionsJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_summaries_pkey" PRIMARY KEY ("documentId")
);

-- CreateIndex
CREATE INDEX "documents_tenderId_status_idx" ON "documents"("tenderId", "status");

-- CreateIndex
CREATE INDEX "documents_orgId_tenderId_idx" ON "documents"("orgId", "tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_orgId_tenderId_docHash_key" ON "documents"("orgId", "tenderId", "docHash");

-- CreateIndex
CREATE INDEX "document_sections_documentId_idx" ON "document_sections"("documentId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sections" ADD CONSTRAINT "document_sections_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_summaries" ADD CONSTRAINT "document_summaries_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
