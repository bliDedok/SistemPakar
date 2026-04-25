import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { evidenceCorpus } from "./evidence-corpus";
import { generateEmbedding } from "../src/modules/rag/embedding.service";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.evidenceChunk.deleteMany();

  const diseaseMap = new Map(
    (await prisma.disease.findMany()).map((disease) => [disease.code, disease.id])
  );

  const symptomMap = new Map(
    (await prisma.symptom.findMany()).map((symptom) => [symptom.code, symptom.id])
  );

  for (const item of evidenceCorpus) {
    const diseaseId = diseaseMap.get(item.diseaseCode);

    if (!diseaseId) {
      console.warn(`Disease tidak ditemukan: ${item.diseaseCode}`);
      continue;
    }

    const embedding = await generateEmbedding(
      [
        item.title,
        item.content,
        `Disease: ${item.diseaseCode}`,
        `Symptoms: ${item.symptomCodes.join(", ")}`,
      ].join("\n")
    );

    await prisma.evidenceChunk.create({
      data: {
        diseaseId,
        title: item.title,
        content: item.content,
        sourceName: item.sourceName,
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        evidenceDoi: item.evidenceDoi,
        embedding,
      },
    });

    for (const symptomCode of item.symptomCodes) {
      const symptomId = symptomMap.get(symptomCode);
      if (!symptomId) continue;

      const symptom = await prisma.symptom.findUnique({
        where: { id: symptomId },
      });

      if (!symptom) continue;

      const symptomChunkContent = [
        item.title,
        `Gejala terkait: ${symptom.name}`,
        item.content,
      ].join("\n");

      const symptomEmbedding = await generateEmbedding(symptomChunkContent);

      await prisma.evidenceChunk.create({
        data: {
          diseaseId,
          symptomId,
          title: `${item.title} - ${symptom.name}`,
          content: symptomChunkContent,
          sourceName: item.sourceName,
          sourceType: "symptom_evidence",
          sourceUrl: item.sourceUrl,
          evidenceDoi: item.evidenceDoi,
          embedding: symptomEmbedding,
        },
      });
    }
  }

  console.log("Seed evidence RAG selesai.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });