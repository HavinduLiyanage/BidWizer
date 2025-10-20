-- AlterEnum
ALTER TYPE "UploadKind" ADD VALUE 'image';

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN "isAdvertisement" BOOLEAN NOT NULL DEFAULT false;
