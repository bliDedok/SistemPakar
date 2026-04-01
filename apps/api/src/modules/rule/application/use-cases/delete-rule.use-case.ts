import type { RuleRepository } from "../../domain/repositories/rule.repository";

export class DeleteRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(id: string) {
    return this.ruleRepository.softDelete(id);
  }
}