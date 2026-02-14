-- CreateTable
CREATE TABLE "PopularShift" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "breakMinutes" DECIMAL(4,2) NOT NULL,
    "role" "StaffRole" NOT NULL,

    CONSTRAINT "PopularShift_pkey" PRIMARY KEY ("id")
);
