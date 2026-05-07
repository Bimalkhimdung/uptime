-- AlterTable: track last login timestamp
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
