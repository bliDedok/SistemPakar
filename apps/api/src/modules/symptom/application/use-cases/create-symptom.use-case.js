export class CreateSymptomUseCase {
    symptomRepository;
    constructor(symptomRepository) {
        this.symptomRepository = symptomRepository;
    }
    async execute(data) {
        if (!data.code?.trim())
            throw new Error("Code wajib diisi");
        if (!data.name?.trim())
            throw new Error("Nama gejala wajib diisi");
        if (!data.questionText?.trim())
            throw new Error("Pertanyaan gejala wajib diisi");
        return this.symptomRepository.create(data);
    }
}
