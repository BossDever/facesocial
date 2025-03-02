-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
