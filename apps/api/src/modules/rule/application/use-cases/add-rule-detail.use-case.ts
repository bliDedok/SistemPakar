import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateRuleDetailInput,
  RuleRepository,
} from "../../domain/repositories/rule.repository";

export class AddRuleDetailUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(data: CreateRuleDetailInput) {
    if (!data.ruleId) throw new Error("Rule wajib dipilih");
    if (!data.symptomId) throw new Error("Gejala wajib dipilih");

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