-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "gaPropertyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleConnectedAt" TIMESTAMP(3),
ADD COLUMN     "googleConnectedEmail" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiresAt" TIMESTAMP(3);
