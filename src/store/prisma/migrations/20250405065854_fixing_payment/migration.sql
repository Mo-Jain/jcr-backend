/*
  Warnings:

  - You are about to drop the column `orderId` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "orderId",
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Payment_id_seq";
