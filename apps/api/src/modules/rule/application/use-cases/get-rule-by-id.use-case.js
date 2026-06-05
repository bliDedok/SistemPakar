export class GetRuleByIdUseCase {
    ruleRepository;
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async execute(id) {
        return this.ruleRepository.findById(id);
    }
}
