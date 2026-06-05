export class UpdateSymptomUseCase {
    symptomRepository;
    constructor(symptomRepository) {
        this.symptomRepository = symptomRepository;
    }
    async execute(id, data) {
        return this.symptomRepository.update(id, data);
    }
}
