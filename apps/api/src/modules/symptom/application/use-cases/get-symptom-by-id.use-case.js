export class GetSymptomByIdUseCase {
    symptomRepository;
    constructor(symptomRepository) {
        this.symptomRepository = symptomRepository;
    }
    async execute(id) {
        return this.symptomRepository.findById(id);
    }
}
