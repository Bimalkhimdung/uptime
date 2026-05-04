-- AlterTable
ALTER TABLE "Monitor"
  ADD COLUMN "sslValidFrom"     TIMESTAMP(3),
  ADD COLUMN "sslValidUntil"    TIMESTAMP(3),
  ADD COLUMN "sslIssuer"        TEXT,
  ADD COLUMN "sslDaysLeft"      INTEGER,
  ADD COLUMN "sslValid"         BOOLEAN,
  ADD COLUMN "sslLastCheckedAt" TIMESTAMP(3),
  ADD COLUMN "domainResolved"   BOOLEAN;
