export class DeleteSymptomUseCase {
    symptomRepository;
    constructor(symptomRepository) {
        this.symptomRepository = symptomRepository;
    }
    async execute(id) {
        await this.symptomRepository.delete(id);
    }
}
