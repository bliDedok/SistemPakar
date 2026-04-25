-- CreateTable
CREATE TABLE "EvidenceChunk" (
    "id" TEXT NOT NULL,
    "diseaseId" TEXT,
    "symptomId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'curated_reference',
    "sourceUrl" TEXT,
    "evidenceDoi" TEXT,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceChunk_diseaseId_idx" ON "EvidenceChunk"("diseaseId");

-- CreateIndex
CREATE INDEX "EvidenceChunk_symptomId_idx" ON "EvidenceChunk"("symptomId");

-- AddForeignKey
ALTER TABLE "EvidenceChunk" ADD CONSTRAINT "EvidenceChunk_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceChunk" ADD CONSTRAINT "EvidenceChunk_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
