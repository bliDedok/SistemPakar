import { prisma } from "../../../../shared/db/prisma";
export class UpdateRuleUseCase {
    ruleRepository;
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async execute(id, data) {
        if (typeof data.minMatch === "number" && data.minMatch < 1) {
            throw new Error("Min match minimal 1");
        }
        if (data.operator && !["AND", "OR"].includes(data.operator)) {
            throw new Error("Operator tidak valid");
        }
        if (data.code) {
            const existing = await prisma.rule.findFirst({
                where: {
                    code: data.code,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new Error("Code rule sudah digunakan");
            }
        }
        return this.ruleRepository.update(id, data);
    }
}
