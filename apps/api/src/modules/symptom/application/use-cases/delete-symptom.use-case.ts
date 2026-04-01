import type { SymptomRepository } from "../../domain/repositories/symptom.repository";

export class DeleteSymptomUseCase {
  constructor(private readonly symptomRepository: SymptomRepository) {}

  async execute(id: string) {
    await this.symptomRepository.delete(id);
  }
}