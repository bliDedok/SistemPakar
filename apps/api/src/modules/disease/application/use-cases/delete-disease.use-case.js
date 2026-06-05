export class DeleteDiseaseUseCase {
    diseaseRepository;
    constructor(diseaseRepository) {
        this.diseaseRepository = diseaseRepository;
    }
    async execute(id) {
        return this.diseaseRepository.softDelete(id);
    }
}
