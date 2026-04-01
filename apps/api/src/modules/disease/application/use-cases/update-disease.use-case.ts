import type {
  DiseaseRepository,
  UpdateDiseaseInput,
} from "../../domain/repositories/disease.repository";

export class UpdateDiseaseUseCase {
  constructor(private readonly diseaseRepository: DiseaseRepository) {}

  async execute(id: string, data: UpdateDiseaseInput) {
    return this.diseaseRepository.update(id, data);
  }
}