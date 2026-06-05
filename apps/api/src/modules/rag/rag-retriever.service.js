import { prisma } from "../../shared/db/prisma";
import { cosineSimilarity, generateEmbedding } from "./embedding.service";
function toNumberArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map(Number).filter(Number.isFinite);
}
export async function retrieveEvidenceForDiagnosis(args) {
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
