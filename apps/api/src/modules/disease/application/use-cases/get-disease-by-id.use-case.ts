import type { DiseaseRepository } from "../../domain/repositories/disease.repository";

export class GetDiseaseByIdUseCase {
  constructor(private readonly diseaseRepository: DiseaseRepository) {}

  async execute(id: string) {
    return this.diseaseRepository.findById(id);
  }
}