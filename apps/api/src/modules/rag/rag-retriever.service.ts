import { prisma } from "../../shared/db/prisma";
import { cosineSimilarity, generateEmbedding } from "./embedding.service";

export type RetrievedEvidence = {
  id: string;
  title: string;
  content: string;
  sourceName: string | null;
  sourceType: string;
  sourceUrl: string | null;
  evidenceDoi: string | null;
  score: number;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter(Number.isFinite);
}

export async function retrieveEvidenceForDiagnosis(args: {
  diseaseCodes: string[];
  symptomNames: string[];
  redFlags: string[];
  urgencyLevel: string;
  topK?: number;
}): Promise<RetrievedEvidence[]> {
  const query = [
    `Diagnosis kandidat: ${args.diseaseCodes.join(", ")}`,
    `Gejala pendukung: ${args.symptomNames.join(", ")}`,
    `Tanda bahaya: ${args.redFlags.join(", ") || "tidak ada"}`,
    `Tingkat urgensi: ${args.urgencyLevel}`,
  ].join("\n");

  const queryEmbedding = await generateEmbedding(query);

  const chunks = await prisma.evidenceChunk.findMany({
    where: {
      OR: [
        {
          disease: {
            code: {
              in: args.diseaseCodes,
            },
          },
        },
        {
          symptom: {
            name: {
              in: args.symptomNames,
            },
          },
        },
      ],
    },
  });

  return chunks
    .map((chunk) => {
      const embedding = toNumberArray(chunk.embedding);

      return {
        id: chunk.id,
        title: chunk.title,
        content: chunk.content,
        sourceName: chunk.sourceName,
        sourceType: chunk.sourceType,
        sourceUrl: chunk.sourceUrl,
        evidenceDoi: chunk.evidenceDoi,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, args.topK ?? 5);
}