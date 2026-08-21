-- CreateTable
CREATE TABLE "CustomerDiagProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "answerIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerDiagProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDiagProfile_customerId_key" ON "CustomerDiagProfile"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerDiagProfile" ADD CONSTRAINT "CustomerDiagProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
