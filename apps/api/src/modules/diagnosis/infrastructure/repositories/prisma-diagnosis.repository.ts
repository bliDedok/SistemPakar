import { prisma } from "../../../../shared/db/prisma.js";

export class PrismaDiagnosisRepository {
  async getDiseaseWeights() {
    return prisma.diseaseSymptomWeight.findMany({
      select: {
        diseaseId: true,
        symptomId: true,
        cfExpert: true,
      },
    });
  }

  async getDiseasesByIds(ids: string[]) {
    return prisma.disease.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        recommendation: true,
      },
    });
  }
}