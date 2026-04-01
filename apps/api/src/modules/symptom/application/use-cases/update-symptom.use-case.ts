import type {
  SymptomRepository,
  UpdateSymptomInput,
} from "../../domain/repositories/symptom.repository";

export class UpdateSymptomUseCase {
  constructor(private readonly symptomRepository: SymptomRepository) {}

  async execute(id: string, data: UpdateSymptomInput) {
    return this.symptomRepository.update(id, data);
  }
}