import type { ConsultationHistoryRepository } from "../../domain/repositories/consultation-history.repository";

export class GetConsultationByIdUseCase {
  constructor(
    private readonly consultationHistoryRepository: ConsultationHistoryRepository
  ) {}

  async execute(id: string) {
    return this.consultationHistoryRepository.findById(id);
  }
}