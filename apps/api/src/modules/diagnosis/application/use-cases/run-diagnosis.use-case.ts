import { CfCalculator } from "../../domain/services/cf-calculator.js";

type Answer = {
  symptomId: string;
  confidenceUser: number;
};

type DiseaseWeight = {
  diseaseId: string;
  symptomId: string;
  cfExpert: number;
};

type DiagnosisRepository = {
  getDiseaseWeights(): Promise<DiseaseWeight[]>;
};

export class RunDiagnosisUseCase {
  constructor(private readonly repository: DiagnosisRepository) {}

  async execute(answers: Answer[]) {
    const weights = await this.repository.getDiseaseWeights();

    const grouped = new Map<
      string,
      { cfExpert: number; confidenceUser: number }[]
    >();

    for (const answer of answers) {
      const matches = weights.filter((w) => w.symptomId === answer.symptomId);

      for (const match of matches) {
        const current = grouped.get(match.diseaseId) ?? [];
        current.push({
          cfExpert: match.cfExpert,
          confidenceUser: answer.confidenceUser,
        });
        grouped.set(match.diseaseId, current);
      }
    }

    return [...grouped.entries()]
      .map(([diseaseId, items]) => ({
        diseaseId,
        scoreCf: CfCalculator.combine(items),
      }))
      .sort((a, b) => b.scoreCf - a.scoreCf);
  }
}