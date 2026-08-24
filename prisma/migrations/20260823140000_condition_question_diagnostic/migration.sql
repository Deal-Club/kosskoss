-- AlterTable
ALTER TABLE "DiagQuestion" ADD COLUMN     "conditionQuestion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "conditionReponses" TEXT NOT NULL DEFAULT '[]';
