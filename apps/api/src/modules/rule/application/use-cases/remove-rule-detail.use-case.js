export class RemoveRuleDetailUseCase {
    ruleRepository;
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async execute(ruleId, detailId) {
        return this.ruleRepository.removeDetail(ruleId, detailId);
    }
}
