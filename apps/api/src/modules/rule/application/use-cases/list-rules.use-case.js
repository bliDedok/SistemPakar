export class ListRulesUseCase {
    ruleRepository;
    constructor(ruleRepository) {
        this.ruleRepository = ruleRepository;
    }
    async execute() {
        return this.ruleRepository.findAll();
    }
}
