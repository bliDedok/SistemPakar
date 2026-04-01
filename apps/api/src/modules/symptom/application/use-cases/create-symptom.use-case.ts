import type {
  CreateSymptomInput,
  SymptomRepository,
} from "../../domain/repositories/symptom.repository";

export class CreateSymptomUseCase {
  constructor(private readonly symptomRepository: SymptomRepository) {}

  async execute(data: CreateSymptomInput) {
    if (!data.code?.trim()) throw new Error("Code wajib diisi");
    if (!data.name?.trim()) throw new Error("Nama gejala wajib diisi");
    if (!data.questionText?.trim()) throw new Error("Pertanyaan gejala wajib diisi");

    return this.symptomRepository.create(data);
  }
}