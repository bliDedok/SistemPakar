-- CreateEnum
CREATE TYPE "SymptomItemType" AS ENUM ('SYMPTOM', 'WARNING', 'SEVERITY', 'CONTEXT', 'LAB', 'COMPLICATION');

-- CreateEnum
CREATE TYPE "InputTier" AS ENUM ('CAREGIVER', 'CAREGIVER_OR_CLINICIAN', 'CLINICIAN', 'CLINICIAN_OR_CAREGIVER', 'HISTORY_CONTEXT', 'LAB', 'LAB_OR_CLINICIAN');

-- CreateEnum
CREATE TYPE "SymptomRole" AS ENUM ('CORE', 'SUPPORTING', 'WARNING_SIGN', 'SEVERE', 'CONTEXT_ONLY', 'COMPLICATION');

-- CreateEnum
CREATE TYPE "KeepStatus" AS ENUM ('KEEP', 'KEEP_OPTIONAL', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "UrgencyMode" AS ENUM ('ORDINARY', 'URGENCY_ONLY');

-- AlterTable
ALTER TABLE "DiseaseSymptomWeight" ADD COLUMN     "candidateCfMax" DOUBLE PRECISION,
ADD COLUMN     "candidateCfMin" DOUBLE PRECISION,
ADD COLUMN     "evidenceDoi" TEXT,
ADD COLUMN     "keepStatus" "KeepStatus" NOT NULL DEFAULT 'KEEP',
ADD COLUMN     "phase" TEXT,
ADD COLUMN     "symptomRole" "SymptomRole" NOT NULL DEFAULT 'SUPPORTING',
ADD COLUMN     "urgencyMode" "UrgencyMode" NOT NULL DEFAULT 'ORDINARY';

-- AlterTable
ALTER TABLE "Symptom" ADD COLUMN     "defaultInputTier" "InputTier",
ADD COLUMN     "isAskable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "itemType" "SymptomItemType" NOT NULL DEFAULT 'SYMPTOM',
ADD COLUMN     "normalizedName" TEXT;

-- CreateTable
CREATE TABLE "SymptomAlias" (
    "id" TEXT NOT NULL,
    "symptomId" TEXT NOT NULL,
    "aliasText" TEXT NOT NULL,
    "normalizedAlias" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SymptomAlias_aliasText_key" ON "SymptomAlias"("aliasText");

-- CreateIndex
CREATE INDEX "SymptomAlias_normalizedAlias_idx" ON "SymptomAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "Symptom_normalizedName_idx" ON "Symptom"("normalizedName");

-- AddForeignKey
ALTER TABLE "SymptomAlias" ADD CONSTRAINT "SymptomAlias_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
