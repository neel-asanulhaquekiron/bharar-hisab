/*
  Warnings:

  - Added the required column `rate_unit` to the `rentals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "rate_unit" "RateUnit" NOT NULL;
