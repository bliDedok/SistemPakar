import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../admin/middleware/admin-auth";
import { GetDashboardStatsUseCase } from "../application/use-cases/get-dashboard-stats.use-case";
import { PrismaDashboardRepository } from "../infrastructure/repositories/prisma-dashboard.repository";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/admin/dashboard/stats", { preHandler: requireAdmin }, async () => {
    const repository = new PrismaDashboardRepository();
    const useCase = new GetDashboardStatsUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data,
    };
  });
}