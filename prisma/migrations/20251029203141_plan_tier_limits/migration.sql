/*
  Warnings:

  - The `planTier` column on the `organizations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `orgId` on table `uploads` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "planExpiresAt" TIMESTAMP(3),
DROP COLUMN "planTier",
ADD COLUMN     "planTier" "PlanTier" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "uploads" ALTER COLUMN "orgId" SET NOT NULL;

-- CreateTable
CREATE TABLE "ai_monthly_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "usedChats" INTEGER NOT NULL DEFAULT 0,
    "usedBriefs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_monthly_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_tender_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "usedChats" INTEGER NOT NULL DEFAULT 0,
    "usedBriefs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "org_tender_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_monthly_usage_organizationId_idx" ON "ai_monthly_usage"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_monthly_usage_organizationId_periodStart_key" ON "ai_monthly_usage"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "org_tender_usage_tenderId_idx" ON "org_tender_usage"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "org_tender_usage_organizationId_tenderId_key" ON "org_tender_usage"("organizationId", "tenderId");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_monthly_usage" ADD CONSTRAINT "ai_monthly_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_tender_usage" ADD CONSTRAINT "org_tender_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_tender_usage" ADD CONSTRAINT "org_tender_usage_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
