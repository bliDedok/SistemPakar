import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateWeightInput,
  WeightRepository,
} from "../../domain/repositories/weight.repository";

export class CreateWeightUseCase {
  constructor(private readonly weightRepository: WeightRepository) {}

  async execute(data: CreateWeightInput) {
    if (!data.diseaseId) {
      throw new Error("Penyakit wajib dipilih");
    }

    if (!data.symptomId) {
      throw new Error("Gejala wajib dipilih");
    }

    if (typeof data.cfExpert !== "number" || data.cfExpert < 0 || data.cfExpert > 1) {
      throw new Error("Nilai CF Expert harus antara 0 sampai 1");
    }

    const existing = await prisma.diseaseSymptomWeight.findFirst({
      where: {
        diseaseId: data.diseaseId,
        symptomId: data.symptomId,
      },
    });

    if (existing) {
      throw new Error("Bobot untuk pasangan penyakit dan gejala ini sudah ada");
    }

    return this.weightRepository.create(data);
  }
}