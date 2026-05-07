-- AlterTable: add isSuperuser flag
ALTER TABLE "User" ADD COLUMN "isSuperuser" BOOLEAN NOT NULL DEFAULT false;
