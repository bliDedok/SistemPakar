import { prisma } from "../../../../shared/db/prisma";
export class UpdateWeightUseCase {
    weightRepository;
    constructor(weightRepository) {
        this.weightRepository = weightRepository;
    }
    async execute(id, data) {
        if (typeof data.cfExpert === "number" && (data.cfExpert < 0 || data.cfExpert > 1)) {
            throw new Error("Nilai CF Expert harus antara 0 sampai 1");
        }
        if (data.diseaseId && data.symptomId) {
            const existing = await prisma.diseaseSymptomWeight.findFirst({
                where: {
                    diseaseId: data.diseaseId,
                    symptomId: data.symptomId,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new Error("Bobot untuk pasangan penyakit dan gejala ini sudah ada");
            }
        }
        return this.weightRepository.update(id, data);
    }
}
