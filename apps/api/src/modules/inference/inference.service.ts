import "dotenv/config";
import { prisma } from "../../shared/db/prisma";
import { DiagnoseRequestDto } from "../consultations/dto/diagnose.dto";
import {
  KeepStatus,
  RuleOperator,
  SymptomRole,
  UrgencyMode,
} from "../../generated/prisma/enums";
import { determineUrgency, type UrgencyResult } from "./urgency.service";
import {
  generateRagExplanation,
  type ExplanationResult,
} from "../explanation/explanation.service";
import {
  calculateCfExpert,
  calculateCfPartial,
  combineCfValues,
} from "./cf-helper";

type MatchedSymptomDetail = {
  symptomCode: string;
  symptomName: string;
  role: string;
};

type CalculationDetail = {
  symptomCode: string;
  symptomName: string;
  role: string;
  mb: number;
  md: number;
  cfExpert: number;
  cfUser: number;
  cfPartial: number;
};

type DiagnosisResult = {
  rank: number;
  diseaseCode: string;
  diseaseName: string;
  severityLevel: string | null;

  cfFinal: number;
  cfPercent: number;

  // backward compatibility
  cfResult: number;
  percentage: number;

  matchCount: number;
  matchedSymptoms: MatchedSymptomDetail[];
  calculationDetails: CalculationDetail[];

  supportingSymptoms: string[];
  redFlags: string[];
  urgencyLevel?: string;

  advice: string | null;
};

type DiagnoseResponse = {
  consultationId: string;

  rankedResults: DiagnosisResult[];
  top1: DiagnosisResult | null;
  top3: DiagnosisResult[];

  redFlags: string[];
  urgency: UrgencyResult;
  urgencyLevel: string;

  explanation: ExplanationResult;
  ragExplanation: string;
  evidenceSources: ExplanationResult["retrievedEvidence"];

  // backward compatibility
  results: DiagnosisResult[];
  diagnosis: DiagnosisResult | null;
};

export type ConsultationDetailResponse = {
  consultation: {
    id: string;
    childName: string | null;
    childAgeMonths: number;
    gender: "MALE" | "FEMALE" | null;
    createdAt: string;
  };

  rankedResults: DiagnosisResult[];
  top1: DiagnosisResult | null;
  top3: DiagnosisResult[];

  redFlags: string[];
  urgency: UrgencyResult;
  urgencyLevel: string;

  explanation: ExplanationResult;
  ragExplanation: string;
  evidenceSources: ExplanationResult["retrievedEvidence"];

  // backward compatibility
  results: DiagnosisResult[];
  diagnosis: DiagnosisResult | null;
};

function round(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function toPercent(value: number): number {
  return round(value * 100, 2);
}

function safeJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function canAffectDiagnosis(weight: {
  keepStatus: KeepStatus;
  urgencyMode: UrgencyMode;
  symptomRole: SymptomRole;
}): boolean {
  return (
    weight.keepStatus !== KeepStatus.EXCLUDE &&
    weight.urgencyMode !== UrgencyMode.URGENCY_ONLY &&
    weight.symptomRole !== SymptomRole.CONTEXT_ONLY
  );
}

export async function diagnoseChild(
  payload: DiagnoseRequestDto
): Promise<DiagnoseResponse> {
  const normalizedAnswers = payload.answers.filter(
    (answer) =>
      typeof answer.symptomCode === "string" &&
      answer.symptomCode.trim() !== "" &&
      typeof answer.userCf === "number" &&
      Number.isFinite(answer.userCf) &&
      answer.userCf >= 0 &&
      answer.userCf <= 1
  );

  const selectedAnswers = normalizedAnswers.filter(
    (answer) => answer.userCf > 0
  );

  const answerMap = new Map<string, number>();

  for (const answer of selectedAnswers) {
    answerMap.set(answer.symptomCode, answer.userCf);
  }

  const symptoms = await prisma.symptom.findMany({
    where: { isActive: true },
  });

  const symptomByCode = new Map(symptoms.map((symptom) => [symptom.code, symptom]));

  const selectedSymptomIds = new Set(
    [...answerMap.keys()]
      .map((code) => symptomByCode.get(code)?.id)
      .filter(Boolean) as string[]
  );

  const redFlags = [
    ...new Set(
      selectedAnswers
        .map((answer) => symptomByCode.get(answer.symptomCode))
        .filter((symptom): symptom is NonNullable<typeof symptom> =>
          Boolean(symptom && symptom.isRedFlag)
        )
        .map((symptom) => symptom.name)
    ),
  ];

  const selectedSymptomsForUrgency = selectedAnswers
    .map((answer) => symptomByCode.get(answer.symptomCode))
    .filter((symptom): symptom is NonNullable<typeof symptom> => Boolean(symptom))
    .map((symptom) => ({
      code: symptom.code,
      name: symptom.name,
      isRedFlag: symptom.isRedFlag,
      itemType: String(symptom.itemType),
    }));

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

  const resultCandidates: Omit<DiagnosisResult, "rank" | "urgencyLevel">[] = [];

  for (const disease of diseases) {
    const matchedRules = disease.rules.filter((rule) => {
      const detailSymptomIds = rule.details.map((detail) => detail.symptomId);

      const matchedCount = detailSymptomIds.filter((symptomId) =>
        selectedSymptomIds.has(symptomId)
      ).length;

      const mandatorySymptoms = rule.details.filter((detail) => detail.isMandatory);

      const mandatoryOk = mandatorySymptoms.every((detail) =>
        selectedSymptomIds.has(detail.symptomId)
      );

      if (!mandatoryOk) return false;

      if (rule.operator === RuleOperator.AND) {
        return matchedCount >= rule.minMatch;
      }

      return matchedCount >= Math.max(1, rule.minMatch);
    });

    if (matchedRules.length === 0) continue;

    const matchedRuleSymptomIds = new Set(
      matchedRules.flatMap((rule) =>
        rule.details.map((detail) => detail.symptomId)
      )
    );

    const matchedWeights = disease.weights.filter((weight) => {
      const isSelected = answerMap.has(weight.symptom.code);
      const isInMatchedRule = matchedRuleSymptomIds.has(weight.symptomId);

      return isSelected && isInMatchedRule && canAffectDiagnosis(weight);
    });

    if (matchedWeights.length === 0) continue;

    const calculationDetails: CalculationDetail[] = [];

    for (const weight of matchedWeights) {
      const cfUser = answerMap.get(weight.symptom.code);

      if (cfUser === undefined) continue;

      const cfExpert = calculateCfExpert(weight.mb, weight.md);
      const cfPartial = calculateCfPartial(cfExpert, cfUser);

      if (cfPartial <= 0) continue;

      calculationDetails.push({
        symptomCode: weight.symptom.code,
        symptomName: weight.symptom.name,
        role: String(weight.symptomRole),
        mb: round(weight.mb),
        md: round(weight.md),
        cfExpert: round(cfExpert),
        cfUser: round(cfUser),
        cfPartial: round(cfPartial),
      });
    }

    if (calculationDetails.length === 0) continue;

    const cfFinal = round(
      combineCfValues(calculationDetails.map((item) => item.cfPartial))
    );

    if (cfFinal <= 0) continue;

    const matchedSymptoms: MatchedSymptomDetail[] = calculationDetails.map(
      (detail) => ({
        symptomCode: detail.symptomCode,
        symptomName: detail.symptomName,
        role: detail.role,
      })
    );

    const diseaseRedFlags = [
      ...new Set(
        matchedWeights
          .filter(
            (weight) =>
              weight.symptom.isRedFlag ||
              weight.symptomRole === SymptomRole.WARNING_SIGN ||
              weight.symptomRole === SymptomRole.SEVERE
          )
          .map((weight) => weight.symptom.name)
      ),
    ];

    resultCandidates.push({
      diseaseCode: disease.code,
      diseaseName: disease.name,
      severityLevel: disease.severityLevel ?? null,

      cfFinal,
      cfPercent: toPercent(cfFinal),

      // backward compatibility
      cfResult: cfFinal,
      percentage: toPercent(cfFinal),

      matchCount: calculationDetails.length,
      matchedSymptoms,
      calculationDetails,

      supportingSymptoms: matchedSymptoms.map((symptom) => symptom.symptomName),
      redFlags: diseaseRedFlags,

      advice: disease.advice,
    });
  }

  const rankedResultsWithoutUrgency = resultCandidates
    .sort((a, b) => {
      if (b.cfFinal !== a.cfFinal) return b.cfFinal - a.cfFinal;
      return b.matchCount - a.matchCount;
    })
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }));

  const topDisease = rankedResultsWithoutUrgency[0]
    ? {
        diseaseName: rankedResultsWithoutUrgency[0].diseaseName,
        severityLevel: rankedResultsWithoutUrgency[0].severityLevel,
      }
    : null;

  const urgency = determineUrgency({
    selectedSymptoms: selectedSymptomsForUrgency,
    topDisease,
    topCfFinal: rankedResultsWithoutUrgency[0]?.cfFinal ?? 0,
    topDiseaseCode: rankedResultsWithoutUrgency[0]?.diseaseCode ?? null,
  });

  const rankedResults: DiagnosisResult[] = rankedResultsWithoutUrgency.map(
    (result) => ({
      ...result,
      urgencyLevel: urgency.level,
    })
  );

  const top1 = rankedResults[0] ?? null;
  const top3 = rankedResults.slice(0, 3);

  const explanation = await generateRagExplanation({
    childProfile: {
      childName: payload.childName ?? null,
      childAgeMonths: payload.childAgeMonths,
      gender: payload.gender ?? null,
    },
    results: top3,
    redFlags,
    urgency,
  });

  const consultationId = await prisma.$transaction(async (tx) => {
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

    for (const result of top3) {
      const disease = diseases.find((item) => item.code === result.diseaseCode);

      if (!disease) continue;

      await tx.consultationResult.create({
        data: {
          consultationId: consultation.id,
          diseaseId: disease.id,
          matchCount: result.matchCount,
          cfResult: result.cfFinal,
          rank: result.rank,

          calculationDetails: result.calculationDetails,
          matchedSymptoms: result.matchedSymptoms,
          redFlags: result.redFlags,
          urgencyLevel: urgency.level,
        },
      });
    }

    return consultation.id;
  });

  return {
    consultationId,

    rankedResults,
    top1,
    top3,

    redFlags,
    urgency,
    urgencyLevel: urgency.level,

    explanation,
    ragExplanation: explanation.summary,
    evidenceSources: explanation.retrievedEvidence,

    // backward compatibility
    results: top3,
    diagnosis: top1,
  };
}

export async function getConsultationResultById(
  id: string
): Promise<ConsultationDetailResponse> {
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      answers: {
        include: {
          symptom: true,
        },
      },
      results: {
        orderBy: {
          rank: "asc",
        },
        include: {
          disease: {
            include: {
              weights: {
                include: {
                  symptom: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!consultation) {
    throw new Error("CONSULTATION_NOT_FOUND");
  }

  const redFlags = [
    ...new Set(
      consultation.answers
        .filter((answer) => answer.symptom.isRedFlag)
        .map((answer) => answer.symptom.name)
    ),
  ];

  const rankedResultsWithoutUrgency: DiagnosisResult[] = consultation.results.map(
    (item) => {
      const calculationDetails = safeJsonArray<CalculationDetail>(
        item.calculationDetails
      );

      const matchedSymptoms =
        safeJsonArray<MatchedSymptomDetail>(item.matchedSymptoms);

      const resultRedFlags = safeJsonArray<string>(item.redFlags);

      const fallbackMatchedSymptoms = item.disease.weights
        .filter((weight) =>
          consultation.answers.some(
            (answer) =>
              answer.symptomId === weight.symptomId && canAffectDiagnosis(weight)
          )
        )
        .map((weight) => ({
          symptomCode: weight.symptom.code,
          symptomName: weight.symptom.name,
          role: String(weight.symptomRole),
        }));

      return {
        rank: item.rank,
        diseaseCode: item.disease.code,
        diseaseName: item.disease.name,
        severityLevel: item.disease.severityLevel ?? null,

        cfFinal: round(item.cfResult),
        cfPercent: toPercent(item.cfResult),

        // backward compatibility
        cfResult: round(item.cfResult),
        percentage: toPercent(item.cfResult),

        matchCount: item.matchCount,

        matchedSymptoms:
          matchedSymptoms.length > 0 ? matchedSymptoms : fallbackMatchedSymptoms,

        calculationDetails,

        supportingSymptoms:
          matchedSymptoms.length > 0
            ? matchedSymptoms.map((symptom) => symptom.symptomName)
            : fallbackMatchedSymptoms.map((symptom) => symptom.symptomName),

        redFlags: resultRedFlags,
        urgencyLevel: item.urgencyLevel ?? undefined,

        advice: item.disease.advice,
      };
    }
  );

  const selectedSymptomsForUrgency = consultation.answers.map((answer) => ({
    code: answer.symptom.code,
    name: answer.symptom.name,
    isRedFlag: answer.symptom.isRedFlag,
    itemType: String(answer.symptom.itemType),
  }));

  const topDisease = rankedResultsWithoutUrgency[0]
    ? {
        diseaseName: rankedResultsWithoutUrgency[0].diseaseName,
        severityLevel: rankedResultsWithoutUrgency[0].severityLevel,
      }
    : null;

  const urgency = determineUrgency({
    selectedSymptoms: selectedSymptomsForUrgency,
    topDisease,
    topCfFinal: rankedResultsWithoutUrgency[0]?.cfFinal ?? 0,
    topDiseaseCode: rankedResultsWithoutUrgency[0]?.diseaseCode ?? null,
  });

  const rankedResults = rankedResultsWithoutUrgency.map((result) => ({
    ...result,
    urgencyLevel: result.urgencyLevel ?? urgency.level,
  }));

  const top1 = rankedResults[0] ?? null;
  const top3 = rankedResults.slice(0, 3);

  const explanation = await generateRagExplanation({
    childProfile: {
      childName: consultation.childName ?? null,
      childAgeMonths: consultation.childAgeMonths,
      gender: consultation.gender ?? null,
    },
    results: top3,
    redFlags,
    urgency,
  });

  return {
    consultation: {
      id: consultation.id,
      childName: consultation.childName ?? null,
      childAgeMonths: consultation.childAgeMonths,
      gender: consultation.gender ?? null,
      createdAt: consultation.createdAt.toISOString(),
    },

    rankedResults,
    top1,
    top3,

    redFlags,
    urgency,
    urgencyLevel: urgency.level,

    explanation,
    ragExplanation: explanation.summary,
    evidenceSources: explanation.retrievedEvidence,

    // backward compatibility
    results: top3,
    diagnosis: top1,
  };
}