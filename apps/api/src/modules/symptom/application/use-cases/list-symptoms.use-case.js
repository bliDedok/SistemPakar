export class ListSymptomsUseCase {
    symptomRepository;
    constructor(symptomRepository) {
        this.symptomRepository = symptomRepository;
    }
    async execute() {
        return this.symptomRepository.findAll();
    }
}
