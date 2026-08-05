-- Diagnostic Beauté : questionnaire éditable depuis le back-office.

CREATE TABLE "DiagQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "subtitleEn" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiagQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiagQuestion_key_key" ON "DiagQuestion"("key");

CREATE TABLE "DiagAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'check',
    "tags" TEXT NOT NULL DEFAULT '{}',
    "chip" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DiagAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiagAnswer_questionId_idx" ON "DiagAnswer"("questionId");

ALTER TABLE "DiagAnswer" ADD CONSTRAINT "DiagAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "DiagQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
