export class GetDiseaseByIdUseCase {
    diseaseRepository;
    constructor(diseaseRepository) {
        this.diseaseRepository = diseaseRepository;
    }
    async execute(id) {
        return this.diseaseRepository.findById(id);
    }
}
