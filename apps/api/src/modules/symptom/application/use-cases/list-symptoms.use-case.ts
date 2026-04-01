import type { SymptomRepository } from "../../domain/repositories/symptom.repository";

export class ListSymptomsUseCase {
  constructor(private readonly symptomRepository: SymptomRepository) {}

  async execute() {
    return this.symptomRepository.findAll();
  }
}