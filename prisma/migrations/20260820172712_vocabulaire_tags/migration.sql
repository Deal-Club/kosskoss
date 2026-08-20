-- CreateTable
CREATE TABLE "ProductTag" (
    "key" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL DEFAULT '',
    "family" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ProductTag_family_position_idx" ON "ProductTag"("family", "position");
