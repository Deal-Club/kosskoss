-- CreateTable
CREATE TABLE "DiagStep" (
    "key" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiagStep_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "DiagStep_position_idx" ON "DiagStep"("position");
