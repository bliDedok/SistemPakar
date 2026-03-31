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
}