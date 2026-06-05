export class UpdateDiseaseUseCase {
    diseaseRepository;
    constructor(diseaseRepository) {
        this.diseaseRepository = diseaseRepository;
    }
    async execute(id, data) {
        return this.diseaseRepository.update(id, data);
    }
}
