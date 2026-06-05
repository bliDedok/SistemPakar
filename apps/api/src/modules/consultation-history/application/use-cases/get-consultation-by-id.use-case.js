export class GetConsultationByIdUseCase {
    consultationHistoryRepository;
    constructor(consultationHistoryRepository) {
        this.consultationHistoryRepository = consultationHistoryRepository;
    }
    async execute(id) {
        return this.consultationHistoryRepository.findById(id);
    }
}
