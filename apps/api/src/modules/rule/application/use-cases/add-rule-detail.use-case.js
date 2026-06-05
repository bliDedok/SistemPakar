import { prisma } from "../../../../shared/db/prisma";
export class AddRuleDetailUseCase {
    ruleRepository;
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async execute(data) {
        if (!data.ruleId)
            throw new Error("Rule wajib dipilih");
        if (!data.symptomId)
            throw new Error("Gejala wajib dipilih");
        const existing = await prisma.ruleDetail.findFirst({
            where: {
                ruleId: data.ruleId,
                symptomId: data.symptomId,
            },
        });
        if (existing) {
            throw new Error("Gejala ini sudah ada di rule");
        }
        return this.ruleRepository.addDetail(data);
    }
}
