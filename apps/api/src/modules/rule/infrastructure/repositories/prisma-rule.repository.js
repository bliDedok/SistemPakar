import { prisma } from "../../../../shared/db/prisma";
function includeRuleRelations() {
    return {
        disease: {
            select: {
                id: true,
                code: true,
                name: true,
            },
        },
        details: {
            include: {
                symptom: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                symptom: {
                    code: "asc",
                },
            },
        },
    };
}
export class PrismaRuleRepository {
    async findAll() {
        return prisma.rule.findMany({
            include: includeRuleRelations(),
            orderBy: [{ priority: "desc" }, { code: "asc" }],
        });
    }
    async findById(id) {
        return prisma.rule.findUnique({
            where: { id },
            include: includeRuleRelations(),
        });
    }
    async create(data) {
        return prisma.rule.create({
            data: {
                code: data.code,
                name: data.name,
                diseaseId: data.diseaseId,
                operator: data.operator,
                minMatch: data.minMatch,
                priority: data.priority ?? 0,
                isActive: data.isActive ?? true,
            },
            include: includeRuleRelations(),
        });
    }
    async update(id, data) {
        return prisma.rule.update({
            where: { id },
            data: {
                code: data.code,
                name: data.name,
                diseaseId: data.diseaseId,
                operator: data.operator,
                minMatch: data.minMatch,
                priority: data.priority,
                isActive: data.isActive,
            },
            include: includeRuleRelations(),
        });
    }
    async softDelete(id) {
        return prisma.rule.update({
            where: { id },
            data: {
                isActive: false,
            },
            include: includeRuleRelations(),
        });
    }
    async addDetail(data) {
        await prisma.ruleDetail.create({
            data: {
                ruleId: data.ruleId,
                symptomId: data.symptomId,
                isMandatory: data.isMandatory ?? false,
            },
        });
        return prisma.rule.findUniqueOrThrow({
            where: { id: data.ruleId },
            include: includeRuleRelations(),
        });
    }
    async removeDetail(ruleId, detailId) {
        await prisma.ruleDetail.delete({
            where: { id: detailId },
        });
        return prisma.rule.findUniqueOrThrow({
            where: { id: ruleId },
            include: includeRuleRelations(),
        });
    }
}
