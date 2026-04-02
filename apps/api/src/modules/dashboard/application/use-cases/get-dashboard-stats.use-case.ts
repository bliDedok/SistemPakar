import type { DashboardRepository } from "../../domain/repositories/dashboard.repository";

export class GetDashboardStatsUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute() {
    return this.dashboardRepository.getStats();
  }
}