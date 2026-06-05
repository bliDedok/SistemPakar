export class ListWeightsUseCase {
    weightRepository;
    constructor(weightRepository) {
        this.weightRepository = weightRepository;
    }
    async execute() {
        return this.weightRepository.findAll();
    }
}
