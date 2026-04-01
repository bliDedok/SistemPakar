import type { RuleRepository } from "../../domain/repositories/rule.repository";

export class RemoveRuleDetailUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(ruleId: string, detailId: string) {
    return this.ruleRepository.removeDetail(ruleId, detailId);
  }
}