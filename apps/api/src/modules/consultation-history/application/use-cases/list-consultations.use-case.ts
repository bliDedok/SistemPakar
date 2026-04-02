import type { ConsultationHistoryRepository } from "../../domain/repositories/consultation-history.repository";

export class ListConsultationsUseCase {
  constructor(
    private readonly consultationHistoryRepository: ConsultationHistoryRepository
  ) {}

  async execute() {
    return this.consultationHistoryRepository.findAll();
  }
}