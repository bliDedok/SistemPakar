import type { RuleRepository } from "../../domain/repositories/rule.repository";

export class GetRuleByIdUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(id: string) {
    return this.ruleRepository.findById(id);
  }
}