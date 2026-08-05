-- CreateTable
CREATE TABLE "LegalContent" (
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalContent_pkey" PRIMARY KEY ("slug","locale")
);
