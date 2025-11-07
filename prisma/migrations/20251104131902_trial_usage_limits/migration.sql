-- CreateTable
CREATE TABLE "org_trial_usage" (
    "orgId" TEXT NOT NULL,
    "briefCredits" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_trial_usage_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "org_trial_usage" ADD CONSTRAINT "org_trial_usage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
