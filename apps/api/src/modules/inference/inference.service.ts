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
  calculateRawEvidenceCf,
  calculateEffectiveEvidenceCf,
  combineEvidenceValues,
} from "./cf-calibration.service"



type DiagnosisResult = {
  diseaseCode: string;
  diseaseName: string;
  severityLevel: string | null;

  rawCfResult?: number;
  rawPercentage?: number;

  cfResult: number;
  percentage: number;

  matchCount: number;
  supportingSymptoms: string[];
  advice: string | null;
};

type DiagnoseResponse = {
  consultationId: string;
  redFlags: string[];
  urgency: UrgencyResult;
  explanation: ExplanationResult;
  results: DiagnosisResult[];
};

export type ConsultationDetailResponse = {
  consultation: {
    id: string;
    childName: string | null;
    childAgeMonths: number;
    gender: "MALE" | "FEMALE" | null;
    createdAt: string;
  };
  redFlags: string[];
  urgency: UrgencyResult;
  explanation: ExplanationResult;
  results: DiagnosisResult[];
};

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

export async function diagnoseChild(
  payload: DiagnoseRequestDto
): Promise<DiagnoseResponse> {
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
  

  const results: DiagnosisResult[] = [];

  for (const disease of diseases) {
    const matchedRules = disease.rules.filter((rule) => {
      const detailSymptomIds = rule.details.map((d) => d.symptomId);
      const matchedCount = detailSymptomIds.filter((id) =>
        selectedSymptomIds.has(id)
      ).length;

      const mandatory = rule.details.filter((d) => d.isMandatory);
      const mandatoryOk = mandatory.every((item) =>
        selectedSymptomIds.has(item.symptomId)
      );

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

    const matchedWeights = disease.weights.filter((w) => {
    const isSelected = answerMap.has(w.symptom.code);
    const isInMatchedRule = matchedRuleSymptomIds.has(w.symptomId);

    const canAffectDiagnosis =
      w.keepStatus !== KeepStatus.EXCLUDE &&
      w.urgencyMode !== UrgencyMode.URGENCY_ONLY &&
      w.symptomRole !== SymptomRole.CONTEXT_ONLY;

    return isSelected && isInMatchedRule && canAffectDiagnosis;
    });

    if (matchedWeights.length === 0) continue;

    const rawEvidenceValues: number[] = [];
    const effectiveEvidenceValues: number[] = [];
    const supportingSymptoms = new Set<string>();

    for (const weight of matchedWeights) {
      const userCf = answerMap.get(weight.symptom.code);

      if (userCf === undefined) continue;

      const rawEvidenceCf = calculateRawEvidenceCf({
        userCf,
        cfExpert: weight.cfExpert,
      });

      const effectiveEvidenceCf = calculateEffectiveEvidenceCf({
        userCf,
        cfExpert: weight.cfExpert,
        symptomRole: weight.symptomRole,
        urgencyMode: weight.urgencyMode,
        keepStatus: weight.keepStatus,
      });

      rawEvidenceValues.push(rawEvidenceCf);

      if (effectiveEvidenceCf > 0) {
        effectiveEvidenceValues.push(effectiveEvidenceCf);
        supportingSymptoms.add(weight.symptom.name);
      }
    }

    const rawTotalCf = combineEvidenceValues(rawEvidenceValues);
    let calibratedTotalCf = combineEvidenceValues(effectiveEvidenceValues);

    if (disease.code === "P014" && !answerMap.has("G040")) {
      calibratedTotalCf = round(calibratedTotalCf * 0.65);
    }

    if (calibratedTotalCf <= 0) continue;

    results.push({
      diseaseCode: disease.code,
      diseaseName: disease.name,
      severityLevel: disease.severityLevel ?? null,

      rawCfResult: round(rawTotalCf),
      rawPercentage: round(rawTotalCf * 100, 2),

      cfResult: round(calibratedTotalCf),
      percentage: round(calibratedTotalCf * 100, 2),

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

  const topDisease = topResults[0]
  ? {
      diseaseName: topResults[0].diseaseName,
      severityLevel: topResults[0].severityLevel,
    }
  : null;

  const urgency = determineUrgency({
    selectedSymptoms: selectedSymptomsForUrgency,
    topDisease,
  });

  const explanation = await generateRagExplanation({
    childProfile: {
      childName: payload.childName ?? null,
      childAgeMonths: payload.childAgeMonths,
      gender: payload.gender ?? null,
    },
    results: topResults,
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

    return consultation.id;
  });

  return {
    consultationId,
    redFlags,
    urgency,
    explanation,
    results: topResults,
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
        orderBy: { rank: "asc" },
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

  const selectedSymptomIds = new Set(consultation.answers.map((a) => a.symptomId));

  const redFlags = [
    ...new Set(
      consultation.answers
        .filter((a) => a.symptom.isRedFlag)
        .map((a) => a.symptom.name)
    ),
  ];

  const results: DiagnosisResult[] = consultation.results.map((item) => ({
    diseaseCode: item.disease.code,
    diseaseName: item.disease.name,
    severityLevel: item.disease.severityLevel ?? null,
    cfResult: round(item.cfResult),
    percentage: round(item.cfResult * 100, 2),
    matchCount: item.matchCount,
    supportingSymptoms: item.disease.weights
      .filter(
        (w) =>
          selectedSymptomIds.has(w.symptomId) &&
          w.keepStatus !== KeepStatus.EXCLUDE &&
          w.urgencyMode !== UrgencyMode.URGENCY_ONLY &&
          w.symptomRole !== SymptomRole.CONTEXT_ONLY
      )
      .map((w) => w.symptom.name),
    advice: item.disease.advice,
  }));

  const selectedSymptomsForUrgency = consultation.answers.map((answer) => ({
    code: answer.symptom.code,
    name: answer.symptom.name,
    isRedFlag: answer.symptom.isRedFlag,
    itemType: String(answer.symptom.itemType),
  }));

  const topDisease = results[0]
    ? {
        diseaseName: results[0].diseaseName,
        severityLevel: results[0].severityLevel,
      }
    : null;

  const urgency = determineUrgency({
    selectedSymptoms: selectedSymptomsForUrgency,
    topDisease,
  });

  const explanation = await generateRagExplanation({
    childProfile: {
      childName: consultation.childName ?? null,
      childAgeMonths: consultation.childAgeMonths,
      gender: consultation.gender ?? null,
    },
    results,
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
    redFlags,
    urgency,
    explanation,
    results,
  };
}