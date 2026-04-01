import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateRuleDetailInput,
  CreateRuleInput,
  RuleRepository,
  UpdateRuleInput,
} from "../../domain/repositories/rule.repository";

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
          code: "asc" as const,
        },
      },
    },
  };
}

export class PrismaRuleRepository implements RuleRepository {
  async findAll() {
    return prisma.rule.findMany({
      include: includeRuleRelations(),
      orderBy: [{ priority: "desc" }, { code: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.rule.findUnique({
      where: { id },
      include: includeRuleRelations(),
    });
  }

  async create(data: CreateRuleInput) {
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

  async update(id: string, data: UpdateRuleInput) {
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

  async softDelete(id: string) {
    return prisma.rule.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: includeRuleRelations(),
    });
  }

  async addDetail(data: CreateRuleDetailInput) {
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

  async removeDetail(ruleId: string, detailId: string) {
    await prisma.ruleDetail.delete({
      where: { id: detailId },
    });

    return prisma.rule.findUniqueOrThrow({
      where: { id: ruleId },
      include: includeRuleRelations(),
    });
  }
}