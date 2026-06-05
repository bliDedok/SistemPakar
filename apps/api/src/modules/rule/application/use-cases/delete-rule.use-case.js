export class DeleteRuleUseCase {
    ruleRepository;
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async execute(id) {
        return this.ruleRepository.softDelete(id);
    }
}
