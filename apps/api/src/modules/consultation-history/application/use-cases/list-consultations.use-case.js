export class ListConsultationsUseCase {
    consultationHistoryRepository;
    constructor(consultationHistoryRepository) {
        this.consultationHistoryRepository = consultationHistoryRepository;
    }
    async execute() {
        return this.consultationHistoryRepository.findAll();
    }
}
