export type DashboardStats = {
  totalSymptoms: number;
  activeSymptoms: number;
  totalDiseases: number;
  activeDiseases: number;
  totalWeights: number;
  totalRules: number;
  activeRules: number;
  totalConsultations: number;
  consultationsLast7Days: number;
};

export interface DashboardRepository {
  getStats(): Promise<DashboardStats>;
}