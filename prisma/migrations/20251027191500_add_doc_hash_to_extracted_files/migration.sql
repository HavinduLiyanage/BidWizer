ALTER TABLE "extracted_files"
    ADD COLUMN "docHash" TEXT,
    ADD COLUMN "storageBucket" TEXT,
    ADD COLUMN "storageKey" TEXT;

UPDATE "extracted_files"
SET "docHash" = "id"
WHERE "docHash" IS NULL;

ALTER TABLE "extracted_files"
ALTER COLUMN "docHash" SET NOT NULL;

CREATE UNIQUE INDEX "extracted_files_docHash_key" ON "extracted_files"("docHash");
CREATE INDEX "extracted_files_docHash_idx" ON "extracted_files"("docHash");
