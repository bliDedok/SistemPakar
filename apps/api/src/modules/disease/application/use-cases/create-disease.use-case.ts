import type {
  CreateDiseaseInput,
  DiseaseRepository,
} from "../../domain/repositories/disease.repository";

export class CreateDiseaseUseCase {
  constructor(private readonly diseaseRepository: DiseaseRepository) {}

  async execute(data: CreateDiseaseInput) {
    if (!data.code?.trim()) {
      throw new Error("Code wajib diisi");
    }

    if (!data.name?.trim()) {
      throw new Error("Nama penyakit wajib diisi");
    }

    return this.diseaseRepository.create(data);
  }
}