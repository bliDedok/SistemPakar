import "dotenv/config";
import { prisma } from "../../shared/db/prisma";
import { RuleOperator } from "../../generated/prisma/enums";
import { DiagnoseRequestDto } from "../consultations/dto/diagnose.dto";


type DiagnosisResult = {
  diseaseCode: string;
  diseaseName: string;
  cfResult: number;
  percentage: number;
  matchCount: number;
  supportingSymptoms: string[];
  advice: string | null;
};

type DiagnoseResponse = {
  redFlags: string[];
  results: DiagnosisResult[];
};

function combineCf(current: number, next: number): number {
  return current + next * (1 - current);
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

export async function diagnoseChild(payload: DiagnoseRequestDto): Promise<DiagnoseResponse> {
  const normalizedAnswers = payload.answers.filter(
    (a) =>
      typeof a.symptomCode === "string" &&
      a.symptomCode.trim() !== "" &&
      typeof a.userCf === "number" &&
      a.userCf >= 0 &&
      a.userCf <= 1
  );

  const selectedAnswers = normalizedAnswers.filter((a) => a.userCf > 0);

  const answerMap = new Map<string, number>();
  for (const answer of selectedAnswers) {
    answerMap.set(answer.symptomCode, answer.userCf);
  }

  const symptoms = await prisma.symptom.findMany({
    where: { isActive: true },
  });

  const symptomByCode = new Map(symptoms.map((s) => [s.code, s]));
  const selectedSymptomIds = new Set(
    [...answerMap.keys()]
      .map((code) => symptomByCode.get(code)?.id)
      .filter(Boolean) as string[]
  );

  const redFlags = [
    ...new Set(
      selectedAnswers
        .map((a) => symptomByCode.get(a.symptomCode))
        .filter((s): s is NonNullable<typeof s> => Boolean(s && s.isRedFlag))
        .map((s) => s.name)
    ),
  ];

  const diseases = await prisma.disease.findMany({
    where: { isActive: true },
    include: {
      rules: {
        where: { isActive: true },
        include: {
          details: {
            include: {
              symptom: true,
            },
          },
        },
      },
      weights: {
        include: {
          symptom: true,
        },
      },
    },
  });

  const results: DiagnosisResult[] = [];

  for (const disease of diseases) {
    const matchedRules = disease.rules.filter((rule) => {
      const detailSymptomIds = rule.details.map((d) => d.symptomId);
      const matchedCount = detailSymptomIds.filter((id) => selectedSymptomIds.has(id)).length;
      const mandatory = rule.details.filter((d) => d.isMandatory);

      const mandatoryOk = mandatory.every((item) => selectedSymptomIds.has(item.symptomId));
      if (!mandatoryOk) return false;

      if (rule.operator === RuleOperator.AND) {
        return matchedCount >= rule.minMatch;
      }

      return matchedCount >= Math.max(1, rule.minMatch);
    });

    if (matchedRules.length === 0) continue;

    const matchedRuleSymptomIds = new Set(
      matchedRules.flatMap((rule) => rule.details.map((detail) => detail.symptomId))
    );

    const matchedWeights = disease.weights.filter(
      (w) =>
        answerMap.has(w.symptom.code) &&
        matchedRuleSymptomIds.has(w.symptomId)
    );

    if (matchedWeights.length === 0) continue;

    let totalCf = 0;
    const supportingSymptoms = new Set<string>();

    for (const weight of matchedWeights) {
      const userCf = answerMap.get(weight.symptom.code) ?? 0;
      const evidenceCf = userCf * weight.cfExpert;

      totalCf = totalCf === 0 ? evidenceCf : combineCf(totalCf, evidenceCf);
      supportingSymptoms.add(weight.symptom.name);
    }

    results.push({
      diseaseCode: disease.code,
      diseaseName: disease.name,
      cfResult: round(totalCf),
      percentage: round(totalCf * 100, 2),
      matchCount: matchedWeights.length,
      supportingSymptoms: [...supportingSymptoms],
      advice: disease.advice,
    });
  }

  results.sort((a, b) => {
    if (b.cfResult !== a.cfResult) return b.cfResult - a.cfResult;
    return b.matchCount - a.matchCount;
  });

  const topResults = results.slice(0, 3);

  await prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.create({
      data: {
        childName: payload.childName,
        childAgeMonths: payload.childAgeMonths,
        gender: payload.gender,
      },
    });

    for (const answer of selectedAnswers) {
      const symptom = symptomByCode.get(answer.symptomCode);
      if (!symptom) continue;

      await tx.consultationAnswer.create({
        data: {
          consultationId: consultation.id,
          symptomId: symptom.id,
          userCf: answer.userCf,
        },
      });
    }

    for (const [index, result] of topResults.entries()) {
      const disease = diseases.find((d) => d.code === result.diseaseCode);
      if (!disease) continue;

      await tx.consultationResult.create({
        data: {
          consultationId: consultation.id,
          diseaseId: disease.id,
          matchCount: result.matchCount,
          cfResult: result.cfResult,
          rank: index + 1,
        },
      });
    }
  });

  return {
    redFlags,
    results: topResults,
  };
}