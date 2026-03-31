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

type DiseaseItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  recommendation: string | null;
};

type DiagnosisRepository = {
  getDiseaseWeights(): Promise<DiseaseWeight[]>;
  getDiseasesByIds(ids: string[]): Promise<DiseaseItem[]>;
};

export class RunDiagnosisUseCase {
  constructor(private readonly repository: DiagnosisRepository) {}

  async execute(answers: Answer[]) {
    const normalizedAnswers = answers.filter(
      (item) => item.confidenceUser > 0 && item.symptomId
    );

    if (normalizedAnswers.length === 0) {
      return [];
    }

    const weights = await this.repository.getDiseaseWeights();

    const grouped = new Map<
      string,
      { cfExpert: number; confidenceUser: number }[]
    >();

    for (const answer of normalizedAnswers) {
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

    const ranked = [...grouped.entries()]
      .map(([diseaseId, items]) => ({
        diseaseId,
        scoreCf: CfCalculator.combine(items),
      }))
      .filter((item) => item.scoreCf > 0)
      .sort((a, b) => b.scoreCf - a.scoreCf);

    if (ranked.length === 0) {
      return [];
    }

    const diseases = await this.repository.getDiseasesByIds(
      ranked.map((item) => item.diseaseId)
    );

    const diseaseMap = new Map(diseases.map((item) => [item.id, item]));

    return ranked.map((item) => {
      const disease = diseaseMap.get(item.diseaseId);

      return {
        diseaseId: item.diseaseId,
        scoreCf: item.scoreCf,
        percentage: Number((item.scoreCf * 100).toFixed(2)),
        disease: disease ?? null,
      };
    });
  }
}