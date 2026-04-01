import type { WeightRepository } from "../../domain/repositories/weight.repository";

export class ListWeightsUseCase {
  constructor(private readonly weightRepository: WeightRepository) {}

  async execute() {
    return this.weightRepository.findAll();
  }
}