/*
  Warnings:

  - Added the required column `hours` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shiftDate` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hours" DECIMAL(4,2) NOT NULL,
ADD COLUMN     "shiftDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Shift_shiftDate_idx" ON "Shift"("shiftDate");

-- CreateIndex
CREATE INDEX "Shift_staffId_shiftDate_idx" ON "Shift"("staffId", "shiftDate");

-- CreateIndex
CREATE INDEX "Staff_userId_idx" ON "Staff"("userId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
