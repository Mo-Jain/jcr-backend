-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('guest', 'host');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledBy" "CancelledBy";
