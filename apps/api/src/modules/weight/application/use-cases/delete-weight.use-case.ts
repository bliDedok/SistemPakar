import type { WeightRepository } from "../../domain/repositories/weight.repository";

export class DeleteWeightUseCase {
  constructor(private readonly weightRepository: WeightRepository) {}

  async execute(id: string) {
    await this.weightRepository.delete(id);
  }
}