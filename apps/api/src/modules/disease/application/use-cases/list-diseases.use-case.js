export class ListDiseasesUseCase {
    diseaseRepository;
    constructor(diseaseRepository) {
        this.diseaseRepository = diseaseRepository;
    }
    async execute() {
        return this.diseaseRepository.findAll();
    }
}
