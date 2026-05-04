-- AlterTable
ALTER TABLE "Monitor"
  ADD COLUMN "domainExpiresAt"     TIMESTAMP(3),
  ADD COLUMN "domainRegistrar"     TEXT,
  ADD COLUMN "domainDaysLeft"      INTEGER,
  ADD COLUMN "domainLastCheckedAt" TIMESTAMP(3);
