-- AlterTable
ALTER TABLE "tenders"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "estimatedValue" TEXT,
  ADD COLUMN "regionLocation" TEXT,
  ADD COLUMN "contactPersonName" TEXT,
  ADD COLUMN "contactNumber" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "companyWebsite" TEXT,
  ADD COLUMN "requirements" JSONB,
  ADD COLUMN "preBidMeetingAt" TIMESTAMP(3);

