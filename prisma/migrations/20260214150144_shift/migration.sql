/*
  Warnings:

  - A unique constraint covering the columns `[userId,email]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `breakMinutes` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "breakMinutes" DECIMAL(4,2) NOT NULL,
ADD COLUMN     "role" "StaffRole" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_email_key" ON "Staff"("userId", "email");
