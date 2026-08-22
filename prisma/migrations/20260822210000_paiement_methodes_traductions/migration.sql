-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "descriptionEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "feeLabelEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "labelEn" TEXT NOT NULL DEFAULT '';
