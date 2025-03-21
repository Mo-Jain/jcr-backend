/*
  Warnings:

  - Made the column `docType` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "docType" SET NOT NULL;
