-- AlterTable
ALTER TABLE "Monitor"
  ADD COLUMN "serverIp"           TEXT,
  ADD COLUMN "serverLat"          DOUBLE PRECISION,
  ADD COLUMN "serverLng"          DOUBLE PRECISION,
  ADD COLUMN "serverCountry"      TEXT,
  ADD COLUMN "serverCountryCode"  TEXT,
  ADD COLUMN "serverRegion"       TEXT,
  ADD COLUMN "serverCity"         TEXT,
  ADD COLUMN "serverGeoCheckedAt" TIMESTAMP(3);
