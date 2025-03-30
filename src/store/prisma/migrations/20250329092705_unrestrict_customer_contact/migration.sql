/*
  Warnings:

  - A unique constraint covering the columns `[name,contact,email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Customer_name_contact_key";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "contact" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_contact_email_key" ON "Customer"("name", "contact", "email");
