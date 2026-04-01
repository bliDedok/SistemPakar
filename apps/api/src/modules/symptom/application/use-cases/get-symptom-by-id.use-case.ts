import type { SymptomRepository } from "../../domain/repositories/symptom.repository";

export class GetSymptomByIdUseCase {
  constructor(private readonly symptomRepository: SymptomRepository) {}

  async execute(id: string) {
    return this.symptomRepository.findById(id);
  }
}