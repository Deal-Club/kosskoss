-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingMethodKey" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "shippingMethodLabel" TEXT NOT NULL DEFAULT 'Standardversand',
ADD COLUMN     "stripePaymentIntentId" TEXT;
