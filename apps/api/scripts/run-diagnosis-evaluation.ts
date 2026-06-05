import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  diagnosisScenarios,
  type DiagnosisScenario,
} from "./diagnosis-scenarios";

type ApiDiagnosisResult = {
  rank?: number;
  diseaseCode?: string;
  diseaseName?: string;
  cfFinal?: number;
  cfPercent?: number;
  percentage?: number;
  cfResult?: number;
  matchCount?: number;
};

type ApiResponseData = {
  consultationId?: string;
  rankedResults?: ApiDiagnosisResult[];
  top1?: ApiDiagnosisResult | null;
  top3?: ApiDiagnosisResult[];
  urgencyLevel?: string;
  urgency?: {
    level?: string;
    label?: string;
    action?: string;
  };
  redFlags?: string[];
  explanation?: {
    source?: string;
    retrievedEvidence?: unknown[];
  };
  evidenceSources?: unknown[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: ApiResponseData;
};

type ScenarioEvaluationResult = {
  scenarioId: string;
  category: string;
  description: string;
  targetDiseaseCode: string | null;
  predictedTop1: string | null;
  predictedTop3: string[];
  cfPercentTop1: number | null;
  urgencyExpected: string | null;
  urgencyActual: string | null;
  redFlagsCount: number;
  evidenceCount: number;
  top1Correct: boolean;
  top3Correct: boolean;
  urgencyCorrect: boolean;
  noDiagnosisCorrect: boolean;
  passed: boolean;
  status: "PASSED" | "FAILED" | "API_ERROR";
  error?: string;
};

const API_URL =
  process.env.DIAGNOSIS_API_URL ??
  "http://localhost:3001/api/consultations/diagnose";

const REPORT_DIR = path.resolve(process.cwd(), "reports");

function safeNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function getTop1(data?: ApiResponseData): ApiDiagnosisResult | null {
  return data?.top1 ?? data?.rankedResults?.[0] ?? null;
}

function getTop3Codes(data?: ApiResponseData): string[] {
  const top3 = data?.top3 ?? data?.rankedResults?.slice(0, 3) ?? [];

  return top3
    .map((item) => item.diseaseCode)
    .filter((code): code is string => Boolean(code));
}

function getCfPercent(item: ApiDiagnosisResult | null) {
  if (!item) return null;

  return safeNumber(item.cfPercent) ?? safeNumber(item.percentage);
}

function getUrgencyLevel(data?: ApiResponseData): string | null {
  return data?.urgencyLevel ?? data?.urgency?.level ?? null;
}

function getEvidenceCount(data?: ApiResponseData): number {
  const explanationEvidence = data?.explanation?.retrievedEvidence;
  const evidenceSources = data?.evidenceSources;

  if (Array.isArray(explanationEvidence)) return explanationEvidence.length;
  if (Array.isArray(evidenceSources)) return evidenceSources.length;

  return 0;
}

async function callDiagnosisApi(scenario: DiagnosisScenario): Promise<{
  ok: boolean;
  response?: ApiResponse;
  error?: string;
}> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childName: scenario.childName,
        childAgeMonths: scenario.childAgeMonths,
        gender: scenario.gender,
        answers: scenario.answers,
      }),
    });

    const json = (await response.json().catch(() => null)) as ApiResponse | null;

    if (!response.ok) {
      return {
        ok: false,
        response: json ?? undefined,
        error: json?.message ?? `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      response: json ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error while calling diagnosis API",
    };
  }
}

function evaluateScenario(
  scenario: DiagnosisScenario,
  apiResult: {
    ok: boolean;
    response?: ApiResponse;
    error?: string;
  }
): ScenarioEvaluationResult {
  const data = apiResult.response?.data;

  const top1 = getTop1(data);
  const predictedTop1 = top1?.diseaseCode ?? null;
  const predictedTop3 = getTop3Codes(data);
  const urgencyActual = getUrgencyLevel(data);
  const cfPercentTop1 = getCfPercent(top1);
  const redFlagsCount = data?.redFlags?.length ?? 0;
  const evidenceCount = getEvidenceCount(data);

  const expectsNoDiagnosis =
    scenario.expectedResultStatus === "EXPECTED_NO_DIAGNOSIS" ||
    scenario.expectedResultStatus === "OUT_OF_CONTEXT" ||
    scenario.targetDiseaseCode === null;

  const noDiagnosisCorrect = expectsNoDiagnosis
    ? !apiResult.ok || predictedTop1 === null
    : false;

  const top1Correct = scenario.targetDiseaseCode
    ? predictedTop1 === scenario.targetDiseaseCode
    : noDiagnosisCorrect;

  const expectedTop3 = scenario.expectedTop3Includes ?? [];

  const top3Correct = scenario.targetDiseaseCode
    ? expectedTop3.length > 0
      ? expectedTop3.every((code) => predictedTop3.includes(code))
      : predictedTop3.includes(scenario.targetDiseaseCode)
    : noDiagnosisCorrect;

  const urgencyCorrect = scenario.expectedUrgencyLevel
    ? urgencyActual === scenario.expectedUrgencyLevel
    : true;

  const passed = expectsNoDiagnosis
    ? noDiagnosisCorrect
    : top1Correct && top3Correct && urgencyCorrect;

  return {
    scenarioId: scenario.scenarioId,
    category: scenario.category,
    description: scenario.description,
    targetDiseaseCode: scenario.targetDiseaseCode,
    predictedTop1,
    predictedTop3,
    cfPercentTop1,
    urgencyExpected: scenario.expectedUrgencyLevel ?? null,
    urgencyActual,
    redFlagsCount,
    evidenceCount,
    top1Correct,
    top3Correct,
    urgencyCorrect,
    noDiagnosisCorrect,
    passed,
    status: apiResult.ok ? (passed ? "PASSED" : "FAILED") : "API_ERROR",
    error: apiResult.error,
  };
}

function divide(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function buildDiseaseMetrics(results: ScenarioEvaluationResult[]) {
  const diseaseCodes = [
    "P001",
    "P002",
    "P003",
    "P004",
    "P005",
    "P006",
    "P007",
    "P008",
  ];

  return diseaseCodes.map((diseaseCode) => {
    const diagnosticResults = results.filter(
      (result) => result.targetDiseaseCode !== null
    );

    const tp = diagnosticResults.filter(
      (result) =>
        result.targetDiseaseCode === diseaseCode &&
        result.predictedTop1 === diseaseCode
    ).length;

    const fp = diagnosticResults.filter(
      (result) =>
        result.targetDiseaseCode !== diseaseCode &&
        result.predictedTop1 === diseaseCode
    ).length;

    const fn = diagnosticResults.filter(
      (result) =>
        result.targetDiseaseCode === diseaseCode &&
        result.predictedTop1 !== diseaseCode
    ).length;

    const precision = divide(tp, tp + fp);
    const recall = divide(tp, tp + fn);
    const f1 = divide(2 * precision * recall, precision + recall);

    return {
      diseaseCode,
      tp,
      fp,
      fn,
      precision,
      recall,
      f1,
    };
  });
}

function buildSummary(results: ScenarioEvaluationResult[]) {
  const diagnosticResults = results.filter(
    (result) => result.targetDiseaseCode !== null
  );

  const noDiagnosisResults = results.filter(
    (result) => result.targetDiseaseCode === null
  );

  const top1Accuracy = divide(
    diagnosticResults.filter((result) => result.top1Correct).length,
    diagnosticResults.length
  );

  const top3Accuracy = divide(
    diagnosticResults.filter((result) => result.top3Correct).length,
    diagnosticResults.length
  );

  const urgencyAccuracy = divide(
    results.filter((result) => result.urgencyCorrect).length,
    results.length
  );

  const noDiagnosisAccuracy = divide(
    noDiagnosisResults.filter((result) => result.noDiagnosisCorrect).length,
    noDiagnosisResults.length
  );

  const passedRate = divide(
    results.filter((result) => result.passed).length,
    results.length
  );

  const diseaseMetrics = buildDiseaseMetrics(results);
  const macroPrecision = divide(
    diseaseMetrics.reduce((sum, item) => sum + item.precision, 0),
    diseaseMetrics.length
  );
  const macroRecall = divide(
    diseaseMetrics.reduce((sum, item) => sum + item.recall, 0),
    diseaseMetrics.length
  );
  const macroF1 = divide(
    diseaseMetrics.reduce((sum, item) => sum + item.f1, 0),
    diseaseMetrics.length
  );

  const byCategory = Object.fromEntries(
    Array.from(new Set(results.map((result) => result.category))).map(
      (category) => {
        const categoryResults = results.filter(
          (result) => result.category === category
        );

        return [
          category,
          {
            total: categoryResults.length,
            passed: categoryResults.filter((result) => result.passed).length,
            failed: categoryResults.filter((result) => !result.passed).length,
            passRate: divide(
              categoryResults.filter((result) => result.passed).length,
              categoryResults.length
            ),
          },
        ];
      }
    )
  );

  return {
    totalScenarios: results.length,
    diagnosticScenarios: diagnosticResults.length,
    noDiagnosisScenarios: noDiagnosisResults.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    passedRate,
    top1Accuracy,
    top3Accuracy,
    urgencyAccuracy,
    noDiagnosisAccuracy,
    macroPrecision,
    macroRecall,
    macroF1,
    byCategory,
    diseaseMetrics,
  };
}

function csvEscape(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join("|")
        : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(results: ScenarioEvaluationResult[]) {
  const headers = [
    "scenarioId",
    "category",
    "targetDiseaseCode",
    "predictedTop1",
    "predictedTop3",
    "cfPercentTop1",
    "urgencyExpected",
    "urgencyActual",
    "redFlagsCount",
    "evidenceCount",
    "top1Correct",
    "top3Correct",
    "urgencyCorrect",
    "noDiagnosisCorrect",
    "passed",
    "status",
    "description",
    "error",
  ];

  const rows = results.map((result) =>
    headers.map((header) =>
      csvEscape(result[header as keyof ScenarioEvaluationResult])
    )
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

async function main() {
  console.log(`Running diagnosis evaluation using API: ${API_URL}`);
  console.log(`Total scenarios: ${diagnosisScenarios.length}`);

  const results: ScenarioEvaluationResult[] = [];

  for (const scenario of diagnosisScenarios) {
    const apiResult = await callDiagnosisApi(scenario);
    const evaluation = evaluateScenario(scenario, apiResult);

    results.push(evaluation);

    const icon = evaluation.passed ? "✅" : "❌";
    console.log(
      `${icon} ${evaluation.scenarioId} | ${evaluation.category} | target=${
        evaluation.targetDiseaseCode ?? "-"
      } | top1=${evaluation.predictedTop1 ?? "-"} | urgency=${
        evaluation.urgencyActual ?? "-"
      }`
    );
  }

  const summary = buildSummary(results);

  await mkdir(REPORT_DIR, { recursive: true });

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    apiUrl: API_URL,
    summary,
    results,
  };

  await writeFile(
    path.join(REPORT_DIR, "diagnosis-evaluation.json"),
    JSON.stringify(jsonReport, null, 2),
    "utf8"
  );

  await writeFile(
    path.join(REPORT_DIR, "diagnosis-evaluation.csv"),
    buildCsv(results),
    "utf8"
  );

  console.log("\n=== Summary ===");
  console.log(`Passed: ${summary.passed}/${summary.totalScenarios}`);
  console.log(`Top-1 Accuracy: ${(summary.top1Accuracy * 100).toFixed(2)}%`);
  console.log(`Top-3 Accuracy: ${(summary.top3Accuracy * 100).toFixed(2)}%`);
  console.log(
    `Urgency Accuracy: ${(summary.urgencyAccuracy * 100).toFixed(2)}%`
  );
  console.log(
    `No Diagnosis Accuracy: ${(summary.noDiagnosisAccuracy * 100).toFixed(2)}%`
  );
  console.log(`Macro Precision: ${(summary.macroPrecision * 100).toFixed(2)}%`);
  console.log(`Macro Recall: ${(summary.macroRecall * 100).toFixed(2)}%`);
  console.log(`Macro F1-score: ${(summary.macroF1 * 100).toFixed(2)}%`);

  console.log("\nReports saved to:");
  console.log(path.join(REPORT_DIR, "diagnosis-evaluation.json"));
  console.log(path.join(REPORT_DIR, "diagnosis-evaluation.csv"));
}

main().catch((error) => {
  console.error("Evaluation runner failed:", error);
  process.exit(1);
});