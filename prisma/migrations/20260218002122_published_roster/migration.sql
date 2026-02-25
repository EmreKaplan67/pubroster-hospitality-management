-- CreateTable
CREATE TABLE "PublishedRoster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedRoster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublishedRoster_userId_idx" ON "PublishedRoster"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedRoster_userId_weekStart_key" ON "PublishedRoster"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "PublishedRoster" ADD CONSTRAINT "PublishedRoster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
