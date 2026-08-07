-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'recue',
ALTER COLUMN "paymentStatus" SET DEFAULT 'en_attente';

-- AlterTable
ALTER TABLE "PaymentMethod" ALTER COLUMN "feeLabel" SET DEFAULT '';

-- CreateTable
CREATE TABLE "CustomerFavorite" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerFavorite_customerId_idx" ON "CustomerFavorite"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFavorite_customerId_productId_key" ON "CustomerFavorite"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "CustomerFavorite" ADD CONSTRAINT "CustomerFavorite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFavorite" ADD CONSTRAINT "CustomerFavorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
