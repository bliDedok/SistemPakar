-- AlterTable
ALTER TABLE "ConsultationResult" ADD COLUMN     "calculationDetails" JSONB,
ADD COLUMN     "matchedSymptoms" JSONB,
ADD COLUMN     "redFlags" JSONB,
ADD COLUMN     "urgencyLevel" TEXT;

-- AlterTable
ALTER TABLE "DiseaseSymptomWeight" ADD COLUMN     "mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "md" DOUBLE PRECISION NOT NULL DEFAULT 0;
