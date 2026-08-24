-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "badge" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "badgeEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "code" TEXT,
ADD COLUMN     "niveau" TEXT NOT NULL DEFAULT 'eco',
ADD COLUMN     "noteKossKoss" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "noteKossKossEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "profilCible" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "profilCibleEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "usageMatin" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "usageMatinEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "usageSoir" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "usageSoirEn" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "RoutineStep" ADD COLUMN     "moment" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "roleEn" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Routine_code_key" ON "Routine"("code");
