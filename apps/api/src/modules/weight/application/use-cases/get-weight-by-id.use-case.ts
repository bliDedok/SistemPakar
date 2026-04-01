import type { WeightRepository } from "../../domain/repositories/weight.repository";

export class GetWeightByIdUseCase {
  constructor(private readonly weightRepository: WeightRepository) {}

  async execute(id: string) {
    return this.weightRepository.findById(id);
  }
}