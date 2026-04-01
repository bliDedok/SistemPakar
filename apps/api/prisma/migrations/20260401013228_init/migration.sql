/*
  Warnings:

  - You are about to drop the column `sessionTitle` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `confidenceUser` on the `ConsultationAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ConsultationAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `durationDays` on the `ConsultationAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ConsultationAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `recommendation` on the `Disease` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `DiseaseSymptomWeight` table. All the data in the column will be lost.
  - You are about to drop the column `mb` on the `DiseaseSymptomWeight` table. All the data in the column will be lost.
  - You are about to drop the column `md` on the `DiseaseSymptomWeight` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DiseaseSymptomWeight` table. All the data in the column will be lost.
  - You are about to drop the column `minMatchCount` on the `Rule` table. All the data in the column will be lost.
  - You are about to drop the column `operatorDefault` on the `Rule` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Symptom` table. All the data in the column will be lost.
  - You are about to drop the `ConsultationMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DiagnosisResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RuleCondition` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[consultationId,symptomId]` on the table `ConsultationAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `childAgeMonths` to the `Consultation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userCf` to the `ConsultationAnswer` table without a default value. This is not possible if the table is not empty.
  - Made the column `questionText` on table `Symptom` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RuleOperator" AS ENUM ('AND', 'OR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- DropForeignKey
ALTER TABLE "ConsultationMessage" DROP CONSTRAINT "ConsultationMessage_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosisResult" DROP CONSTRAINT "DiagnosisResult_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosisResult" DROP CONSTRAINT "DiagnosisResult_diseaseId_fkey";

-- DropForeignKey
ALTER TABLE "RuleCondition" DROP CONSTRAINT "RuleCondition_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "RuleCondition" DROP CONSTRAINT "RuleCondition_symptomId_fkey";

-- AlterTable
ALTER TABLE "Consultation" DROP COLUMN "sessionTitle",
DROP COLUMN "source",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "childAgeMonths" INTEGER NOT NULL,
ADD COLUMN     "childName" TEXT,
ADD COLUMN     "gender" "Gender";

-- AlterTable
ALTER TABLE "ConsultationAnswer" DROP COLUMN "confidenceUser",
DROP COLUMN "createdAt",
DROP COLUMN "durationDays",
DROP COLUMN "notes",
ADD COLUMN     "userCf" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Disease" DROP COLUMN "recommendation",
ADD COLUMN     "advice" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "DiseaseSymptomWeight" DROP COLUMN "createdAt",
DROP COLUMN "mb",
DROP COLUMN "md",
DROP COLUMN "updatedAt",
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "Rule" DROP COLUMN "minMatchCount",
DROP COLUMN "operatorDefault",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minMatch" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "operator" "RuleOperator" NOT NULL DEFAULT 'AND',
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Symptom" DROP COLUMN "description",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "questionText" SET NOT NULL;

-- DropTable
DROP TABLE "ConsultationMessage";

-- DropTable
DROP TABLE "DiagnosisResult";

-- DropTable
DROP TABLE "RuleCondition";

-- CreateTable
CREATE TABLE "RuleDetail" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "symptomId" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RuleDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationResult" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "matchCount" INTEGER NOT NULL,
    "cfResult" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "ConsultationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RuleDetail_ruleId_symptomId_key" ON "RuleDetail"("ruleId", "symptomId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationResult_consultationId_diseaseId_key" ON "ConsultationResult"("consultationId", "diseaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationAnswer_consultationId_symptomId_key" ON "ConsultationAnswer"("consultationId", "symptomId");

-- AddForeignKey
ALTER TABLE "RuleDetail" ADD CONSTRAINT "RuleDetail_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleDetail" ADD CONSTRAINT "RuleDetail_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationResult" ADD CONSTRAINT "ConsultationResult_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationResult" ADD CONSTRAINT "ConsultationResult_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
