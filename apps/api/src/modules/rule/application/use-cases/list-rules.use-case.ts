import type { RuleRepository } from "../../domain/repositories/rule.repository";

export class ListRulesUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute() {
    return this.ruleRepository.findAll();
  }
}