import type { DiseaseRepository } from "../../domain/repositories/disease.repository";

export class ListDiseasesUseCase {
  constructor(private readonly diseaseRepository: DiseaseRepository) {}

  async execute() {
    return this.diseaseRepository.findAll();
  }
}