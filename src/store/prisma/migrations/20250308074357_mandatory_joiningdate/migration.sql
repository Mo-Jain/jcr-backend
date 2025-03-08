/*
  Warnings:

  - Made the column `joiningDate` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "joiningDate" SET NOT NULL;
