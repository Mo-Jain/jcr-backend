/*
  Warnings:

  - A unique constraint covering the columns `[carId,userId]` on the table `FavoriteCar` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FavoriteCar_carId_userId_key" ON "FavoriteCar"("carId", "userId");
