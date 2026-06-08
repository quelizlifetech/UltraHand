-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailChangeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailLocked" BOOLEAN NOT NULL DEFAULT false;
