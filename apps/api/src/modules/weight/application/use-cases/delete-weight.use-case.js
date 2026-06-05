export class DeleteWeightUseCase {
    weightRepository;
    constructor(weightRepository) {
        this.weightRepository = weightRepository;
    }
    async execute(id) {
        await this.weightRepository.delete(id);
    }
}
