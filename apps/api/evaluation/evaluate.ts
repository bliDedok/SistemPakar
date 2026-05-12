#!/usr/bin/env tsx
/**
 * ============================================================================
 * Evaluator for Hybrid Expert System (CF + RAG) — Penyakit Anak
 * ============================================================================
 *
 * Mengiterasi semua skenario di test-scenarios.json, mengirim ke API,
 * menghitung metrik evaluasi (Top-1, Top-3, P/R/F1, Urgency, Red Flag,
 * Refusal), dan menghasilkan output JSON + CSV untuk dipakai di bagian
 * Results & Discussion paper.
 *
 * Cara pakai:
 *   pnpm exec tsx evaluate.ts
 *   pnpm exec tsx evaluate.ts --scenarios=./test-scenarios.json
 *   pnpm exec tsx evaluate.ts --base-url=http://localhost:3001
 *   pnpm exec tsx evaluate.ts --output=./results --delay=200
 *
 * Output (di folder --output, default ./results):
 *   - results-detail.json      Hasil mentah per skenario (untuk debugging)
 *   - results-summary.csv      Tabel: 1 baris per skenario, kolom metrik
 *   - results-aggregate.csv    Ringkasan: macro accuracy, F1, dll
 *   - results-per-disease.csv  Precision/Recall/F1 per kelas penyakit
 *
 * Prasyarat:
 *   - API server jalan (pnpm dev:api di root project)
 *   - Database sudah di-seed (pnpm db:fresh)
 *   - Node 18+ (untuk built-in fetch)
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";

// ============================================================================
// Types
// ============================================================================

type DiagnosisAnswer = {
  symptomCode: string;
  userCf: number;
  symptomName?: string;
};

type DiagnosticInput = {
  childName: string | null;
  childAgeMonths: number;
  gender: "MALE" | "FEMALE" | null;
  answers: DiagnosisAnswer[];
};

type ChatbotInput = {
  messages: { role: "user" | "assistant"; content: string }[];
  profile?: Record<string, unknown>;
};

type Scenario = {
  id: string;
  category: "typical" | "overlap" | "redflag" | "edge" | "out_of_context";
  name: string;
  description: string;
  inputType: "diagnosis" | "chatbot";
  input: DiagnosticInput | ChatbotInput;
  expected: {
    topOneTarget?: string | null;
    topThreeShouldContain?: string[];
    expectedUrgency?: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
    expectedRedFlags?: string[];
    shouldRefuse?: boolean;
    evaluationFocus?: string;
    expectedBehavior?: string;
    checkedFields?: Record<string, unknown>;
  };
  rationale?: string;
};

type ScenarioFile = {
  metadata: Record<string, unknown>;
  scenarios: Scenario[];
};

type DiagnosticResult = {
  scenarioId: string;
  category: string;
  name: string;
  durationMs: number;

  // Raw API response (kept minimal for the summary)
  apiTopOne: string | null;
  apiTopOneCf: number | null;
  apiTopThree: string[];
  apiUrgency: string | null;
  apiRedFlags: string[];
  apiExplanationSource: string | null;
  apiRetrievedEvidenceCount: number;

  // Expected
  expectedTopOne: string | null;
  expectedTopThreeAll: string[];
  expectedUrgency: string | null;
  expectedRedFlags: string[];

  // Per-scenario metrics
  topOneCorrect: 0 | 1;
  topThreeCorrect: 0 | 1; // is topOneTarget in top-3?
  topThreeCoverageScore: number; // 0..1, fraction of expectedTopThreeAll in top-3
  urgencyCorrect: 0 | 1;
  redFlagRecall: number; // 0..1
  refusalAppropriate: 0 | 1 | null; // null for diagnostic, 0/1 for OOC

  ok: boolean;
  errorMessage?: string;
  rawResponse?: unknown;
};

// ============================================================================
// CLI args
// ============================================================================

function parseArgs() {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .map((a) => a.replace(/^--/, "").split("="))
      .map(([k, v]) => [k, v ?? "true"]),
  );

  return {
    scenariosPath: (args.scenarios as string) || "./test-scenarios.json",
    baseUrl: (args["base-url"] as string) || "http://localhost:3001",
    outputDir: (args.output as string) || "./results",
    delayMs: Number(args.delay ?? 150),
  };
}

// ============================================================================
// API Client
// ============================================================================

async function callDiagnoseApi(
  baseUrl: string,
  input: DiagnosticInput,
): Promise<unknown> {
  const res = await fetch(`${baseUrl}/api/consultations/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function callChatbotApi(
  baseUrl: string,
  input: ChatbotInput,
): Promise<unknown> {
  // Send the LAST user message; previous messages become history.
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");

  if (!lastUser) {
    throw new Error("Tidak ada pesan user di chatbot input");
  }

  const history = input.messages.filter((m) => m !== lastUser);

  const res = await fetch(`${baseUrl}/api/chatbot/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: lastUser.content,
      history,
      profile: input.profile ?? {},
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ============================================================================
// Response normalizers (handle both wrapped and unwrapped shapes)
// ============================================================================

function unwrap<T = Record<string, unknown>>(response: unknown): T {
  if (!response || typeof response !== "object") return {} as T;
  const r = response as Record<string, unknown>;
  return ((r.data as T) ?? r) as T;
}

function extractDiagnostic(response: unknown) {
  const data = unwrap<{
    results?: { diseaseCode?: string; cfResult?: number }[];
    redFlags?: string[];
    urgency?: { level?: string };
    explanation?: { source?: string; retrievedEvidence?: unknown[] };
  }>(response);

  const results = data.results ?? [];

  return {
    topOne: results[0]?.diseaseCode ?? null,
    topOneCf: results[0]?.cfResult ?? null,
    topThree: results.slice(0, 3).map((r) => r.diseaseCode!).filter(Boolean),
    urgency: data.urgency?.level ?? null,
    redFlags: data.redFlags ?? [],
    explanationSource: data.explanation?.source ?? null,
    retrievedEvidenceCount: data.explanation?.retrievedEvidence?.length ?? 0,
  };
}

function extractChatbot(response: unknown) {
  const data = unwrap<{
    structured?: {
      symptoms?: { code: string; confidence: number }[];
      canDiagnose?: boolean;
    };
    reply?: string;
  }>(response);

  return {
    extractedSymptoms: data.structured?.symptoms ?? [],
    canDiagnose: data.structured?.canDiagnose ?? false,
    reply: data.reply ?? "",
  };
}

// ============================================================================
// Per-scenario evaluators
// ============================================================================

function evaluateDiagnostic(
  scenario: Scenario,
  response: unknown,
  durationMs: number,
): DiagnosticResult {
  const r = extractDiagnostic(response);
  const e = scenario.expected;

  const expectedTopOne = e.topOneTarget ?? null;
  const expectedTopThreeAll = e.topThreeShouldContain ?? [];
  const expectedUrgency = e.expectedUrgency ?? null;
  const expectedRedFlags = e.expectedRedFlags ?? [];

  // Top-1: jika expectedTopOne null, dianggap benar bila sistem juga return null
  const topOneCorrect: 0 | 1 =
    expectedTopOne === null
      ? r.topOne === null
        ? 1
        : 0
      : r.topOne === expectedTopOne
        ? 1
        : 0;

  // Top-3: target ada di top-3
  const topThreeCorrect: 0 | 1 =
    expectedTopOne === null
      ? r.topThree.length === 0
        ? 1
        : 0
      : r.topThree.includes(expectedTopOne)
        ? 1
        : 0;

  // Top-3 coverage: fraksi dari semua target yang ada di top-3
  const topThreeCoverageScore =
    expectedTopThreeAll.length === 0
      ? 1
      : expectedTopThreeAll.filter((t) => r.topThree.includes(t)).length /
        expectedTopThreeAll.length;

  // Urgency
  const urgencyCorrect: 0 | 1 =
    expectedUrgency === null ? 1 : r.urgency === expectedUrgency ? 1 : 0;

  // Red flag recall: berapa banyak expected yang terdeteksi
  const redFlagRecall =
    expectedRedFlags.length === 0
      ? r.redFlags.length === 0
        ? 1
        : 1 // tidak penalize jika sistem deteksi extra red flag (itu masalah precision)
      : expectedRedFlags.filter((f) =>
          r.redFlags.some((d) => d.toLowerCase().includes(f.toLowerCase())),
        ).length / expectedRedFlags.length;

  return {
    scenarioId: scenario.id,
    category: scenario.category,
    name: scenario.name,
    durationMs,

    apiTopOne: r.topOne,
    apiTopOneCf: r.topOneCf,
    apiTopThree: r.topThree,
    apiUrgency: r.urgency,
    apiRedFlags: r.redFlags,
    apiExplanationSource: r.explanationSource,
    apiRetrievedEvidenceCount: r.retrievedEvidenceCount,

    expectedTopOne,
    expectedTopThreeAll,
    expectedUrgency,
    expectedRedFlags,

    topOneCorrect,
    topThreeCorrect,
    topThreeCoverageScore: Number(topThreeCoverageScore.toFixed(3)),
    urgencyCorrect,
    redFlagRecall: Number(redFlagRecall.toFixed(3)),
    refusalAppropriate: null,

    ok: true,
    rawResponse: response,
  };
}

function evaluateOutOfContext(
  scenario: Scenario,
  response: unknown,
  durationMs: number,
): DiagnosticResult {
  const r = extractChatbot(response);

  // Refusal benar = tidak ekstrak gejala AND canDiagnose=false
  const refusalAppropriate: 0 | 1 =
    r.extractedSymptoms.length === 0 && r.canDiagnose === false ? 1 : 0;

  return {
    scenarioId: scenario.id,
    category: scenario.category,
    name: scenario.name,
    durationMs,

    apiTopOne: null,
    apiTopOneCf: null,
    apiTopThree: [],
    apiUrgency: null,
    apiRedFlags: [],
    apiExplanationSource: null,
    apiRetrievedEvidenceCount: 0,

    expectedTopOne: null,
    expectedTopThreeAll: [],
    expectedUrgency: null,
    expectedRedFlags: [],

    topOneCorrect: 0,
    topThreeCorrect: 0,
    topThreeCoverageScore: 0,
    urgencyCorrect: 0,
    redFlagRecall: 0,
    refusalAppropriate,

    ok: true,
    rawResponse: response,
  };
}

// ============================================================================
// Aggregate metrics
// ============================================================================

type AggregateMetrics = {
  totalScenarios: number;
  diagnosticScenarios: number;
  oocScenarios: number;

  topOneAccuracy: number;
  topThreeAccuracy: number;
  topThreeCoverage: number;
  urgencyAccuracy: number;
  redFlagRecallMacro: number;
  refusalAppropriateness: number;

  macroPrecision: number;
  macroRecall: number;
  macroF1: number;

  avgLatencyMs: number;
  errorCount: number;
};

type PerDiseaseMetrics = {
  disease: string;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
  support: number;
};

function aggregate(results: DiagnosticResult[]): AggregateMetrics {
  const diagnostic = results.filter((r) => r.category !== "out_of_context");
  const ooc = results.filter((r) => r.category === "out_of_context");
  const ok = results.filter((r) => r.ok);
  const errors = results.filter((r) => !r.ok);

  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  // Hitung per-disease metrics
  const diseases = new Set<string>();
  diagnostic.forEach((r) => {
    if (r.expectedTopOne) diseases.add(r.expectedTopOne);
    if (r.apiTopOne) diseases.add(r.apiTopOne);
  });

  const perDisease: PerDiseaseMetrics[] = [...diseases].map((d) => {
    const tp = diagnostic.filter(
      (r) => r.expectedTopOne === d && r.apiTopOne === d,
    ).length;
    const fp = diagnostic.filter(
      (r) => r.expectedTopOne !== d && r.apiTopOne === d,
    ).length;
    const fn = diagnostic.filter(
      (r) => r.expectedTopOne === d && r.apiTopOne !== d,
    ).length;
    const support = diagnostic.filter((r) => r.expectedTopOne === d).length;

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

    return {
      disease: d,
      truePositive: tp,
      falsePositive: fp,
      falseNegative: fn,
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      support,
    };
  });

  const macroPrecision = mean(perDisease.map((p) => p.precision));
  const macroRecall = mean(perDisease.map((p) => p.recall));
  const macroF1 = mean(perDisease.map((p) => p.f1));

  return {
    totalScenarios: results.length,
    diagnosticScenarios: diagnostic.length,
    oocScenarios: ooc.length,

    topOneAccuracy: Number(mean(diagnostic.map((r) => r.topOneCorrect)).toFixed(3)),
    topThreeAccuracy: Number(mean(diagnostic.map((r) => r.topThreeCorrect)).toFixed(3)),
    topThreeCoverage: Number(mean(diagnostic.map((r) => r.topThreeCoverageScore)).toFixed(3)),
    urgencyAccuracy: Number(mean(diagnostic.map((r) => r.urgencyCorrect)).toFixed(3)),
    redFlagRecallMacro: Number(mean(diagnostic.map((r) => r.redFlagRecall)).toFixed(3)),
    refusalAppropriateness: Number(
      mean(ooc.map((r) => r.refusalAppropriate ?? 0)).toFixed(3),
    ),

    macroPrecision: Number(macroPrecision.toFixed(3)),
    macroRecall: Number(macroRecall.toFixed(3)),
    macroF1: Number(macroF1.toFixed(3)),

    avgLatencyMs: Math.round(mean(ok.map((r) => r.durationMs))),
    errorCount: errors.length,
  };
}

function perDiseaseMetrics(results: DiagnosticResult[]): PerDiseaseMetrics[] {
  const diagnostic = results.filter((r) => r.category !== "out_of_context");
  const diseases = new Set<string>();
  diagnostic.forEach((r) => {
    if (r.expectedTopOne) diseases.add(r.expectedTopOne);
    if (r.apiTopOne) diseases.add(r.apiTopOne);
  });

  return [...diseases]
    .sort()
    .map((d) => {
      const tp = diagnostic.filter(
        (r) => r.expectedTopOne === d && r.apiTopOne === d,
      ).length;
      const fp = diagnostic.filter(
        (r) => r.expectedTopOne !== d && r.apiTopOne === d,
      ).length;
      const fn = diagnostic.filter(
        (r) => r.expectedTopOne === d && r.apiTopOne !== d,
      ).length;
      const support = diagnostic.filter((r) => r.expectedTopOne === d).length;

      const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
      const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
      const f1 =
        precision + recall === 0
          ? 0
          : (2 * precision * recall) / (precision + recall);

      return {
        disease: d,
        truePositive: tp,
        falsePositive: fp,
        falseNegative: fn,
        precision: Number(precision.toFixed(3)),
        recall: Number(recall.toFixed(3)),
        f1: Number(f1.toFixed(3)),
        support,
      };
    });
}

// ============================================================================
// CSV writer
// ============================================================================

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = Array.isArray(value) ? value.join(";") : String(value);

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(rows: Record<string, unknown>[], outPath: string) {
  if (rows.length === 0) {
    fs.writeFileSync(outPath, "");
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];

  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

// ============================================================================
// Main
// ============================================================================

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function statusIcon(result: DiagnosticResult): string {
  if (!result.ok) return "✗";
  if (result.category === "out_of_context") {
    return result.refusalAppropriate === 1 ? "✓" : "✗";
  }
  return result.topOneCorrect === 1 ? "✓" : "✗";
}

async function main() {
  const args = parseArgs();
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  SPK Anak — Hybrid Expert System Evaluator               ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`📂 Scenarios:  ${path.resolve(args.scenariosPath)}`);
  console.log(`🌐 Base URL:   ${args.baseUrl}`);
  console.log(`📊 Output:     ${path.resolve(args.outputDir)}`);
  console.log(`⏱  Delay:      ${args.delayMs}ms\n`);

  // Load scenarios
  const raw = fs.readFileSync(args.scenariosPath, "utf8");
  const file = JSON.parse(raw) as ScenarioFile;
  const scenarios = file.scenarios;

  console.log(`Memuat ${scenarios.length} skenario.\n`);

  fs.mkdirSync(args.outputDir, { recursive: true });

  // Iterate
  const results: DiagnosticResult[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const t0 = Date.now();

    try {
      let response: unknown;

      if (scenario.inputType === "diagnosis") {
        response = await callDiagnoseApi(
          args.baseUrl,
          scenario.input as DiagnosticInput,
        );
      } else {
        response = await callChatbotApi(
          args.baseUrl,
          scenario.input as ChatbotInput,
        );
      }

      const duration = Date.now() - t0;

      const result =
        scenario.inputType === "diagnosis"
          ? evaluateDiagnostic(scenario, response, duration)
          : evaluateOutOfContext(scenario, response, duration);

      results.push(result);

      console.log(
        `${statusIcon(result)}  ${scenario.id} [${scenario.category.padEnd(15)}] ${scenario.name.padEnd(50)} ${duration}ms`,
      );
    } catch (err) {
      const duration = Date.now() - t0;
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error(`✗  ${scenario.id} [ERROR] ${errorMessage}`);

      results.push({
        scenarioId: scenario.id,
        category: scenario.category,
        name: scenario.name,
        durationMs: duration,
        apiTopOne: null,
        apiTopOneCf: null,
        apiTopThree: [],
        apiUrgency: null,
        apiRedFlags: [],
        apiExplanationSource: null,
        apiRetrievedEvidenceCount: 0,
        expectedTopOne: scenario.expected.topOneTarget ?? null,
        expectedTopThreeAll: scenario.expected.topThreeShouldContain ?? [],
        expectedUrgency: scenario.expected.expectedUrgency ?? null,
        expectedRedFlags: scenario.expected.expectedRedFlags ?? [],
        topOneCorrect: 0,
        topThreeCorrect: 0,
        topThreeCoverageScore: 0,
        urgencyCorrect: 0,
        redFlagRecall: 0,
        refusalAppropriate: scenario.category === "out_of_context" ? 0 : null,
        ok: false,
        errorMessage,
      });
    }

    if (i < scenarios.length - 1 && args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }

  // Aggregate
  const agg = aggregate(results);
  const perDisease = perDiseaseMetrics(results);

  // Write outputs
  const detailPath = path.join(args.outputDir, "results-detail.json");
  fs.writeFileSync(
    detailPath,
    JSON.stringify({ metadata: file.metadata, aggregate: agg, perDisease, results }, null, 2),
  );

  // Summary CSV (1 row per scenario)
  const summaryRows = results.map((r) => ({
    scenario_id: r.scenarioId,
    category: r.category,
    name: r.name,
    duration_ms: r.durationMs,
    expected_top1: r.expectedTopOne ?? "",
    api_top1: r.apiTopOne ?? "",
    api_top1_cf: r.apiTopOneCf ?? "",
    api_top3: r.apiTopThree.join(";"),
    expected_top3_all: r.expectedTopThreeAll.join(";"),
    expected_urgency: r.expectedUrgency ?? "",
    api_urgency: r.apiUrgency ?? "",
    expected_red_flags: r.expectedRedFlags.join(";"),
    api_red_flags: r.apiRedFlags.join(";"),
    api_explanation_source: r.apiExplanationSource ?? "",
    api_evidence_count: r.apiRetrievedEvidenceCount,
    top1_correct: r.topOneCorrect,
    top3_correct: r.topThreeCorrect,
    top3_coverage: r.topThreeCoverageScore,
    urgency_correct: r.urgencyCorrect,
    red_flag_recall: r.redFlagRecall,
    refusal_appropriate: r.refusalAppropriate ?? "",
    ok: r.ok ? 1 : 0,
    error: r.errorMessage ?? "",
  }));

  writeCsv(summaryRows, path.join(args.outputDir, "results-summary.csv"));

  // Aggregate CSV (1 row total)
  writeCsv(
    [
      {
        metric: "Top-1 Accuracy",
        value: agg.topOneAccuracy,
        notes: `${results.filter((r) => r.topOneCorrect === 1 && r.category !== "out_of_context").length} / ${agg.diagnosticScenarios}`,
      },
      {
        metric: "Top-3 Accuracy",
        value: agg.topThreeAccuracy,
        notes: `target ada di top-3`,
      },
      {
        metric: "Top-3 Coverage",
        value: agg.topThreeCoverage,
        notes: `fraksi target overlap di top-3`,
      },
      {
        metric: "Macro Precision",
        value: agg.macroPrecision,
        notes: "rata-rata precision per kelas",
      },
      {
        metric: "Macro Recall",
        value: agg.macroRecall,
        notes: "rata-rata recall per kelas",
      },
      {
        metric: "Macro F1",
        value: agg.macroF1,
        notes: "rata-rata F1 per kelas",
      },
      {
        metric: "Urgency Accuracy",
        value: agg.urgencyAccuracy,
        notes: "ketepatan klasifikasi urgensi",
      },
      {
        metric: "Red Flag Recall",
        value: agg.redFlagRecallMacro,
        notes: "rata-rata recall deteksi red flag",
      },
      {
        metric: "Refusal Appropriateness",
        value: agg.refusalAppropriateness,
        notes: `${results.filter((r) => r.refusalAppropriate === 1).length} / ${agg.oocScenarios}`,
      },
      {
        metric: "Average Latency (ms)",
        value: agg.avgLatencyMs,
        notes: `${agg.totalScenarios} skenario, ${agg.errorCount} error`,
      },
    ],
    path.join(args.outputDir, "results-aggregate.csv"),
  );

  // Per-disease CSV
  writeCsv(
    perDisease.map((p) => ({ ...p })),
    path.join(args.outputDir, "results-per-disease.csv"),
  );

  // Console summary
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  HASIL EVALUASI                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Total skenario        : ${agg.totalScenarios}  (${agg.diagnosticScenarios} diagnostik, ${agg.oocScenarios} OOC)`);
  console.log(`Errors                : ${agg.errorCount}`);
  console.log(`Avg latency           : ${agg.avgLatencyMs} ms`);
  console.log("");
  console.log("METRIK DIAGNOSTIK");
  console.log(`  Top-1 Accuracy      : ${(agg.topOneAccuracy * 100).toFixed(1)}%`);
  console.log(`  Top-3 Accuracy      : ${(agg.topThreeAccuracy * 100).toFixed(1)}%`);
  console.log(`  Top-3 Coverage      : ${(agg.topThreeCoverage * 100).toFixed(1)}%`);
  console.log(`  Macro Precision     : ${agg.macroPrecision.toFixed(3)}`);
  console.log(`  Macro Recall        : ${agg.macroRecall.toFixed(3)}`);
  console.log(`  Macro F1            : ${agg.macroF1.toFixed(3)}`);
  console.log("");
  console.log("METRIK URGENSI & RED FLAG");
  console.log(`  Urgency Accuracy    : ${(agg.urgencyAccuracy * 100).toFixed(1)}%`);
  console.log(`  Red Flag Recall     : ${(agg.redFlagRecallMacro * 100).toFixed(1)}%`);
  console.log("");
  console.log("METRIK CHATBOT (OOC)");
  console.log(`  Refusal Appropriate : ${(agg.refusalAppropriateness * 100).toFixed(1)}%`);
  console.log("");
  console.log("PER-DISEASE PERFORMANCE");
  console.log(`  ${"Disease".padEnd(8)} ${"Sup".padEnd(4)} ${"TP".padEnd(4)} ${"FP".padEnd(4)} ${"FN".padEnd(4)} ${"P".padEnd(7)} ${"R".padEnd(7)} F1`);
  for (const d of perDisease) {
    console.log(
      `  ${d.disease.padEnd(8)} ${String(d.support).padEnd(4)} ${String(d.truePositive).padEnd(4)} ${String(d.falsePositive).padEnd(4)} ${String(d.falseNegative).padEnd(4)} ${d.precision.toFixed(3).padEnd(7)} ${d.recall.toFixed(3).padEnd(7)} ${d.f1.toFixed(3)}`,
    );
  }
  console.log("");
  console.log(`📊 Output disimpan di: ${path.resolve(args.outputDir)}`);
  console.log(`   - results-detail.json`);
  console.log(`   - results-summary.csv`);
  console.log(`   - results-aggregate.csv`);
  console.log(`   - results-per-disease.csv\n`);
}

main().catch((err) => {
  console.error("\n❌ Evaluator gagal:", err);
  process.exit(1);
});
