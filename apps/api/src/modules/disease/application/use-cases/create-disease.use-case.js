export class CreateDiseaseUseCase {
    diseaseRepository;
    constructor(diseaseRepository) {
        this.diseaseRepository = diseaseRepository;
    }
    async execute(data) {
        if (!data.code?.trim()) {
            throw new Error("Code wajib diisi");
        }
        if (!data.name?.trim()) {
            throw new Error("Nama penyakit wajib diisi");
        }
        return this.diseaseRepository.create(data);
    }
}
