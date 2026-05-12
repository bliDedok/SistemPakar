/**
 * generate-figures.ts
 * Generator visual untuk hasil evaluasi SPK Anak (CF + RAG).
 *
 * Output:
 * - table-v-compact.svg/png
 * - table-vi-per-disease.svg/png
 * - table-vii-aggregate.svg/png
 * - fig-aggregate-metrics.svg/png
 * - fig-f1-per-disease.svg/png
 * - fig-urgency-analysis.svg/png
 * - fig-rag-latency.svg/png
 *
 * Jalankan setelah evaluate.ts selesai membuat:
 * - results-detail.json
 * - results-summary.csv
 * - results-aggregate.csv
 * - results-per-disease.csv
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type EvalResult = {
  scenarioId: string;
  category: string;
  name: string;
  durationMs?: number;
  apiTopOne?: string | null;
  apiTopOneCf?: number | null;
  apiTopThree?: string[];
  apiUrgency?: string | null;
  apiRedFlags?: string[];
  apiExplanationSource?: string | null;
  apiRetrievedEvidenceCount?: number | null;
  expectedTopOne?: string | null;
  expectedTopThreeAll?: string[];
  expectedUrgency?: string | null;
  expectedRedFlags?: string[];
  topOneCorrect?: number | boolean | null;
  topThreeCorrect?: number | boolean | null;
  urgencyCorrect?: number | boolean | null;
  redFlagRecall?: number | null;
  refusalAppropriate?: number | boolean | null;
  ok?: boolean | number;
};

type PerDisease = {
  disease: string;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
  support: number;
};

type Aggregate = {
  totalScenarios: number;
  diagnosticScenarios: number;
  oocScenarios: number;
  topOneAccuracy: number;
  topThreeAccuracy: number;
  topThreeCoverage?: number;
  urgencyAccuracy: number;
  redFlagRecallMacro: number;
  refusalAppropriateness: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  avgLatencyMs: number;
  errorCount: number;
};

type ResultsDetail = {
  metadata?: Record<string, unknown>;
  aggregate: Aggregate;
  perDisease: PerDisease[];
  results: EvalResult[];
};

type Args = {
  input: string;
  output: string;
  png: boolean;
};

const diseaseNames: Record<string, string> = {
  P001: "Enterobiasis",
  P003: "Influenza",
  P004: "DBD",
  P005: "Gastroenteritis",
  P006: "Pneumonia",
  P010: "Roseola",
  P013: "Otitis Media",
  P014: "Malaria",
};

const categoryLabels: Record<string, string> = {
  typical: "Typical",
  overlap: "Overlap",
  redflag: "Red flag",
  edge: "Edge case",
  out_of_context: "Out-of-context",
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    input: "apps/api/evaluation/results/results-detail.json",
    output: "apps/api/evaluation/results/figures",
    png: true,
  };

  for (const item of argv.slice(2)) {
    if (item.startsWith("--input=")) {
      args.input = item.replace("--input=", "");
    }

    if (item.startsWith("--output=")) {
      args.output = item.replace("--output=", "");
    }

    if (item === "--no-png") {
      args.png = false;
    }
  }

  return args;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmt(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return value.toFixed(digits);
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

function boolish(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

async function writeSvgAndPng(
  svg: string,
  outBase: string,
  makePng: boolean,
): Promise<void> {
  const svgPath = `${outBase}.svg`;
  fs.writeFileSync(svgPath, svg, "utf8");

  if (makePng) {
    const pngPath = `${outBase}.png`;
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
  }
}

function svgShell(
  width: number,
  height: number,
  title: string,
  body: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${width / 2}" y="32" text-anchor="middle" font-family="Times New Roman, serif" font-size="18" font-weight="700">${esc(title)}</text>
  ${body}
</svg>`;
}

function makeTableSvg(opts: {
  title: string;
  columns: string[];
  rows: (string | number)[];
  width?: number;
  rowHeight?: number;
  colWidths?: number[];
  fontSize?: number;
}): string {
  const width = opts.width ?? 1200;
  const marginX = 36;
  const top = 55;
  const rowHeight = opts.rowHeight ?? 38;
  const headerHeight = rowHeight;
  const tableWidth = width - marginX * 2;

  const colWidths =
    opts.colWidths ??
    opts.columns.map(() => tableWidth / opts.columns.length);

  const rowCount = Math.ceil(opts.rows.length / opts.columns.length);
  const height = top + headerHeight + rowCount * rowHeight + 36;
  const fontSize = opts.fontSize ?? 14;

  let x = marginX;
  let header = "";

  for (let i = 0; i < opts.columns.length; i++) {
    header += `
      <rect x="${x}" y="${top}" width="${colWidths[i]}" height="${headerHeight}" fill="#eaf2ff" stroke="#1f2937" stroke-width="1"/>
      <text x="${x + colWidths[i] / 2}" y="${top + 24}" text-anchor="middle" font-family="Times New Roman, serif" font-size="${fontSize}" font-weight="700">${esc(opts.columns[i])}</text>`;
    x += colWidths[i];
  }

  let body = "";

  for (let r = 0; r < rowCount; r++) {
    x = marginX;
    const y = top + headerHeight + r * rowHeight;
    const fill = r % 2 === 0 ? "#ffffff" : "#f8fafc";

    for (let c = 0; c < opts.columns.length; c++) {
      const value = opts.rows[r * opts.columns.length + c] ?? "";

      body += `
        <rect x="${x}" y="${y}" width="${colWidths[c]}" height="${rowHeight}" fill="${fill}" stroke="#1f2937" stroke-width="0.8"/>
        <text x="${x + colWidths[c] / 2}" y="${y + 24}" text-anchor="middle" font-family="Times New Roman, serif" font-size="${fontSize}">${esc(value)}</text>`;
      x += colWidths[c];
    }
  }

  return svgShell(width, height, opts.title, header + body);
}

function makeTableSvgFromRows(opts: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  width?: number;
  rowHeight?: number;
  colWidths?: number[];
  fontSize?: number;
}): string {
  const flatRows = opts.rows.flat();

  return makeTableSvg({
    title: opts.title,
    columns: opts.columns,
    rows: flatRows,
    width: opts.width,
    rowHeight: opts.rowHeight,
    colWidths: opts.colWidths,
    fontSize: opts.fontSize,
  });
}

function makeBarChartSvg(opts: {
  title: string;
  labels: string[];
  values: number[];
  max?: number;
  width?: number;
  height?: number;
  valueSuffix?: string;
  digits?: number;
}): string {
  const width = opts.width ?? 1100;
  const height = opts.height ?? 620;
  const margin = {
    left: 90,
    right: 42,
    top: 70,
    bottom: 120,
  };

  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const max = opts.max ?? Math.max(...opts.values, 1);
  const barGap = 18;
  const barW = (chartW - barGap * (opts.labels.length - 1)) / opts.labels.length;
  const digits = opts.digits ?? 3;

  let grid = "";

  for (let i = 0; i <= 5; i++) {
    const val = (max / 5) * i;
    const y = margin.top + chartH - (val / max) * chartH;

    grid += `
      <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartW}" y2="${y}" stroke="#e5e7eb"/>
      <text x="${margin.left - 12}" y="${y + 5}" text-anchor="end" font-family="Times New Roman, serif" font-size="13">${fmt(val, 1)}</text>`;
  }

  let bars = "";

  for (let i = 0; i < opts.values.length; i++) {
    const value = opts.values[i];
    const x = margin.left + i * (barW + barGap);
    const barH = (value / max) * chartH;
    const y = margin.top + chartH - barH;
    const label = opts.labels[i];
    const shown = `${value.toFixed(digits)}${opts.valueSuffix ?? ""}`;

    bars += `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#7aa6d9" stroke="#1f2937" stroke-width="0.5"/>
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-family="Times New Roman, serif" font-size="14">${esc(shown)}</text>
      <text transform="translate(${x + barW / 2}, ${margin.top + chartH + 22}) rotate(35)" text-anchor="start" font-family="Times New Roman, serif" font-size="14">${esc(label)}</text>`;
  }

  const axes = `
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartH}" stroke="#111827" stroke-width="1.2"/>
    <line x1="${margin.left}" y1="${margin.top + chartH}" x2="${margin.left + chartW}" y2="${margin.top + chartH}" stroke="#111827" stroke-width="1.2"/>`;

  return svgShell(width, height, opts.title, grid + axes + bars);
}

function compactCategoryRows(results: EvalResult[]): (string | number)[][] {
  const categories = ["typical", "overlap", "redflag", "edge"];

  return categories
    .map((category) => {
      const rows = results.filter((r) => r.category === category);
      if (!rows.length) return null;

      const total = rows.length;
      const top1 = rows.filter((r) => boolish(r.topOneCorrect)).length;
      const top3 = rows.filter((r) => boolish(r.topThreeCorrect)).length;

      const cfValues = rows
        .map((r) => r.apiTopOneCf)
        .filter((v): v is number => typeof v === "number");

      const avgCf = cfValues.length
        ? cfValues.reduce((a, b) => a + b, 0) / cfValues.length
        : null;

      const miss = rows
        .filter((r) => !boolish(r.topOneCorrect))
        .map((r) => r.scenarioId)
        .join(", ");

      return [
        categoryLabels[category] ?? category,
        `${rows[0].scenarioId}-${rows[rows.length - 1].scenarioId}`,
        total,
        `${top1}/${total}`,
        `${top3}/${total}`,
        avgCf === null ? "-" : fmt(avgCf, 3),
        miss || "-",
      ];
    })
    .filter(Boolean) as (string | number)[][];
}

async function generateFigures(
  inputJson: string,
  outputDir: string,
  makePng = true,
): Promise<void> {
  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const raw = fs.readFileSync(inputJson, "utf8");
  const data = JSON.parse(raw) as ResultsDetail;

  const diagnostic = data.results.filter((r) => r.category !== "out_of_context");

  const tableVRows = compactCategoryRows(diagnostic);

  const tableVSvg = makeTableSvgFromRows({
    title: "Tabel V. Hasil Pengujian Inferensi Certainty Factor per Kategori",
    columns: [
      "Kategori",
      "Skenario",
      "Jumlah",
      "Top-1",
      "Top-3",
      "Rata-rata CF",
      "Top-1 Tidak Sesuai",
    ],
    rows: tableVRows,
    width: 1300,
    colWidths: [170, 170, 120, 120, 120, 170, 270],
    fontSize: 15,
  });

  await writeSvgAndPng(
    tableVSvg,
    path.join(outputDir, "table-v-compact"),
    makePng,
  );

  const tableVIRows = data.perDisease.map((d) => [
    d.disease,
    diseaseNames[d.disease] ?? d.disease,
    d.truePositive,
    d.falsePositive,
    d.falseNegative,
    fmt(d.precision),
    fmt(d.recall),
    fmt(d.f1),
    d.support,
  ]);

  const tableVISvg = makeTableSvgFromRows({
    title: "Tabel VI. Performa Klasifikasi per Penyakit",
    columns: [
      "Kode",
      "Penyakit",
      "TP",
      "FP",
      "FN",
      "Precision",
      "Recall",
      "F1-score",
      "Support",
    ],
    rows: tableVIRows,
    width: 1300,
    colWidths: [95, 230, 85, 85, 85, 145, 135, 135, 120],
    fontSize: 15,
  });

  await writeSvgAndPng(
    tableVISvg,
    path.join(outputDir, "table-vi-per-disease"),
    makePng,
  );

  const tableVIIRows: (string | number)[][] = [
    [
      "Top-1 Accuracy",
      pct(data.aggregate.topOneAccuracy),
      "24 dari 27 skenario diagnostik",
    ],
    [
      "Top-3 Accuracy",
      pct(data.aggregate.topThreeAccuracy),
      "Target selalu masuk tiga kandidat teratas",
    ],
    [
      "Macro Precision",
      fmt(data.aggregate.macroPrecision),
      "Rata-rata precision seluruh kelas",
    ],
    [
      "Macro Recall",
      fmt(data.aggregate.macroRecall),
      "Rata-rata recall seluruh kelas",
    ],
    [
      "Macro F1-score",
      fmt(data.aggregate.macroF1),
      "Rata-rata F1 seluruh kelas",
    ],
    [
      "Error Count",
      data.aggregate.errorCount,
      "Tidak ada error komunikasi API",
    ],
  ];

  const tableVIISvg = makeTableSvgFromRows({
    title: "Tabel VII. Ringkasan Metrik Agregat Inferensi Certainty Factor",
    columns: ["Metrik", "Nilai", "Keterangan"],
    rows: tableVIIRows,
    width: 1200,
    colWidths: [300, 180, 610],
    fontSize: 15,
  });

  await writeSvgAndPng(
    tableVIISvg,
    path.join(outputDir, "table-vii-aggregate"),
    makePng,
  );

  const aggregateChartSvg = makeBarChartSvg({
    title: "Gambar X. Ringkasan Metrik Inferensi Certainty Factor",
    labels: ["Top-1", "Top-3", "Precision", "Recall", "F1"],
    values: [
      data.aggregate.topOneAccuracy,
      data.aggregate.topThreeAccuracy,
      data.aggregate.macroPrecision,
      data.aggregate.macroRecall,
      data.aggregate.macroF1,
    ],
    max: 1,
    width: 1000,
    height: 560,
    digits: 3,
  });

  await writeSvgAndPng(
    aggregateChartSvg,
    path.join(outputDir, "fig-aggregate-metrics"),
    makePng,
  );

  const f1ChartSvg = makeBarChartSvg({
    title: "Gambar X. F1-score per Penyakit",
    labels: data.perDisease.map(
      (d) => `${d.disease} ${diseaseNames[d.disease] ?? ""}`,
    ),
    values: data.perDisease.map((d) => d.f1),
    max: 1,
    width: 1200,
    height: 620,
    digits: 3,
  });

  await writeSvgAndPng(
    f1ChartSvg,
    path.join(outputDir, "fig-f1-per-disease"),
    makePng,
  );

  const urgencyRows = diagnostic.filter((r) => r.expectedUrgency && r.apiUrgency);

  const rank: Record<string, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    EMERGENCY: 4,
  };

  const over = urgencyRows.filter(
    (r) => rank[String(r.apiUrgency)] > rank[String(r.expectedUrgency)],
  ).length;

  const under = urgencyRows.filter(
    (r) => rank[String(r.apiUrgency)] < rank[String(r.expectedUrgency)],
  ).length;

  const exact = urgencyRows.filter(
    (r) => rank[String(r.apiUrgency)] === rank[String(r.expectedUrgency)],
  ).length;

  const nUrg = urgencyRows.length || 1;

  const urgencyChartSvg = makeBarChartSvg({
    title: "Gambar X. Analisis Klasifikasi Urgensi",
    labels: ["Exact", "Over-triage", "Under-triage"],
    values: [exact / nUrg, over / nUrg, under / nUrg],
    max: 1,
    width: 900,
    height: 540,
    digits: 3,
  });

  await writeSvgAndPng(
    urgencyChartSvg,
    path.join(outputDir, "fig-urgency-analysis"),
    makePng,
  );

  const ragUsed = data.results.filter(
    (r) => r.apiExplanationSource === "rag_llm",
  ).length;

  const fallback = data.results.filter(
    (r) => r.apiExplanationSource && r.apiExplanationSource !== "rag_llm",
  ).length;

  const noSource = data.results.length - ragUsed - fallback;
  const latencySeconds = data.aggregate.avgLatencyMs / 1000;

  const ragRows: (string | number)[][] = [
    [
      "RAG LLM digunakan",
      `${ragUsed}/${data.results.length}`,
      pct(ragUsed / data.results.length),
    ],
    [
      "Template fallback",
      `${fallback}/${data.results.length}`,
      pct(fallback / data.results.length),
    ],
    [
      "Tanpa source",
      `${noSource}/${data.results.length}`,
      pct(noSource / data.results.length),
    ],
    [
      "Rata-rata latency",
      `${latencySeconds.toFixed(1)} detik`,
      "Dipengaruhi pemanggilan LLM/RAG",
    ],
  ];

  const ragTableSvg = makeTableSvgFromRows({
    title: "Gambar X. Ringkasan Penggunaan RAG dan Latency",
    columns: ["Aspek", "Nilai", "Keterangan"],
    rows: ragRows,
    width: 1100,
    colWidths: [330, 220, 440],
    fontSize: 15,
  });

  await writeSvgAndPng(
    ragTableSvg,
    path.join(outputDir, "fig-rag-latency"),
    makePng,
  );

  const readme = `# Visual Evaluasi SPK Anak

File yang disarankan untuk artikel:

## Subbab B. Hasil Inferensi Certainty Factor
1. table-v-compact.png
2. table-vi-per-disease.png
3. table-vii-aggregate.png
4. fig-aggregate-metrics.png
5. fig-f1-per-disease.png

## Subbab C. Evaluasi Red Flag dan Urgensi
1. fig-urgency-analysis.png

## Subbab D. Evaluasi Penjelasan RAG
1. fig-rag-latency.png

Catatan:
- Tabel V versi ringkas dipakai di badan artikel.
- Detail 27 skenario dapat diletakkan pada lampiran.
- Gunakan PNG untuk Word, SVG untuk kualitas vektor.
`;

  fs.writeFileSync(path.join(outputDir, "README-figures.md"), readme, "utf8");

  console.log("✅ Visual evaluasi berhasil dibuat di:", outputDir);
}

const args = parseArgs(process.argv);

generateFigures(args.input, args.output, args.png).catch((err) => {
  console.error("❌ Gagal membuat visual evaluasi:", err);
  process.exit(1);
});