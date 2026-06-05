export class GetDashboardStatsUseCase {
    dashboardRepository;
    constructor(dashboardRepository) {
        this.dashboardRepository = dashboardRepository;
    }
    async execute() {
        return this.dashboardRepository.getStats();
    }
}
