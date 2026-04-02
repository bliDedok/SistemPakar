import { prisma } from "../../../../shared/db/prisma";
import type {
  DashboardRepository,
  DashboardStats,
} from "../../domain/repositories/dashboard.repository";

export class PrismaDashboardRepository implements DashboardRepository {
  async getStats(): Promise<DashboardStats> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalSymptoms,
      activeSymptoms,
      totalDiseases,
      activeDiseases,
      totalWeights,
      totalRules,
      activeRules,
      totalConsultations,
      consultationsLast7Days,
    ] = await Promise.all([
      prisma.symptom.count(),
      prisma.symptom.count({
        where: { isActive: true },
      }),
      prisma.disease.count(),
      prisma.disease.count({
        where: { isActive: true },
      }),
      prisma.diseaseSymptomWeight.count(),
      prisma.rule.count(),
      prisma.rule.count({
        where: { isActive: true },
      }),
      prisma.consultation.count(),
      prisma.consultation.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
    ]);

    return {
      totalSymptoms,
      activeSymptoms,
      totalDiseases,
      activeDiseases,
      totalWeights,
      totalRules,
      activeRules,
      totalConsultations,
      consultationsLast7Days,
    };
  }
}