import { prisma } from "../../../../shared/db/prisma";
import type {
  UpdateWeightInput,
  WeightRepository,
} from "../../domain/repositories/weight.repository";

export class UpdateWeightUseCase {
  constructor(private readonly weightRepository: WeightRepository) {}

  async execute(id: string, data: UpdateWeightInput) {
    if (typeof data.cfExpert === "number" && (data.cfExpert < 0 || data.cfExpert > 1)) {
      throw new Error("Nilai CF Expert harus antara 0 sampai 1");
    }

    if (data.diseaseId && data.symptomId) {
      const existing = await prisma.diseaseSymptomWeight.findFirst({
        where: {
          diseaseId: data.diseaseId,
          symptomId: data.symptomId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new Error("Bobot untuk pasangan penyakit dan gejala ini sudah ada");
      }
    }

    return this.weightRepository.update(id, data);
  }
}