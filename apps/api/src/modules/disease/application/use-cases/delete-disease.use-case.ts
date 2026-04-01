import type { DiseaseRepository } from "../../domain/repositories/disease.repository";

export class DeleteDiseaseUseCase {
  constructor(private readonly diseaseRepository: DiseaseRepository) {}

  async execute(id: string) {
    return this.diseaseRepository.softDelete(id);
  }
}