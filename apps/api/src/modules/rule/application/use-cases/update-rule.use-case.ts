import { prisma } from "../../../../shared/db/prisma";
import type {
  RuleRepository,
  UpdateRuleInput,
} from "../../domain/repositories/rule.repository";

export class UpdateRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(id: string, data: UpdateRuleInput) {
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