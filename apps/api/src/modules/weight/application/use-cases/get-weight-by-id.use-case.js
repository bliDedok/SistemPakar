export class GetWeightByIdUseCase {
    weightRepository;
    constructor(weightRepository) {
        this.weightRepository = weightRepository;
    }
    async execute(id) {
        return this.weightRepository.findById(id);
    }
}
