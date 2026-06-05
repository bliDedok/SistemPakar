"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchConsultationById } from "@/src/lib/api";

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

type MatchedSymptom = {
  symptomCode: string;
  symptomName: string;
  role: string;
};


type ConsultationResultItem = {
  rank?: number;

  diseaseCode: string;
  diseaseName: string;
  severityLevel?: string | null;

  // field lama
  cfResult: number;
  percentage: number;

  // field baru dari backend CF
  cfFinal?: number;
  cfPercent?: number;

  matchCount: number;

  // field lama
  supportingSymptoms: string[];

  // field baru
  matchedSymptoms?: MatchedSymptom[];
  calculationDetails?: CalculationDetail[];
  redFlags?: string[];

  advice: string | null;
};

type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

type UrgencyResult = {
  level: UrgencyLevel;
  label: string;
  reasons: string[];
  action: string;
};

type ExplanationEvidence = {
  title: string;
  sourceName: string | null;
  sourceType: string;
  sourceUrl: string | null;
  evidenceDoi: string | null;
  score: number;
};

type ExplanationResult = {
  source: "rag_llm" | "llm" | "template";
  summary: string;
  whyThisDiagnosis: string;
  evidenceBasedExplanation?: string;
  urgencyExplanation: string;
  nextStep: string;
  disclaimer: string;
  retrievedEvidence?: ExplanationEvidence[];
};

type ConsultationPayload = {
  consultation: {
    id: string;
    childName: string | null;
    childAgeMonths: number | null;
    gender: "MALE" | "FEMALE" | null;
    createdAt?: string;
  };

  redFlags: string[];
  urgency?: UrgencyResult;
  explanation?: ExplanationResult;

  // backward compatibility
  results: ConsultationResultItem[];

  // response baru
  rankedResults?: ConsultationResultItem[];
  top1?: ConsultationResultItem | null;
  top3?: ConsultationResultItem[];
};

type ConsultationDetailResponse = {
  success?: boolean;
  message?: string;
  disclaimer?: string;
  data?: ConsultationPayload;
};

type ConsultationResultState = ConsultationDetailResponse | ConsultationPayload;

function isWrappedResponse(
  value: ConsultationResultState | null
): value is ConsultationDetailResponse {
  return !!value && "data" in value;
}

function isPayloadResponse(
  value: ConsultationResultState | null
): value is ConsultationPayload {
  return !!value && "consultation" in value;
}

function formatGender(value: "MALE" | "FEMALE" | null | undefined) {
  if (value === "MALE") return "Laki-laki";
  if (value === "FEMALE") return "Perempuan";
  return "-";
}

function formatAge(months: number | null | undefined) {
  if (months === null || months === undefined) return "-";

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0) {
    return remainingMonths > 0
      ? `${years} tahun ${remainingMonths} bulan`
      : `${years} tahun`;
  }

  return `${remainingMonths} bulan`;
}

function getRiskTone(percentage: number) {
  if (percentage >= 80) {
    return {
      label: "Kemungkinan tinggi",
      className: "bg-red-50 border-red-200 text-red-700",
      barClassName: "bg-red-500",
    };
  }

  if (percentage >= 50) {
    return {
      label: "Perlu perhatian",
      className: "bg-amber-50 border-amber-200 text-amber-700",
      barClassName: "bg-amber-500",
    };
  }

  return {
    label: "Kemungkinan rendah",
    className: "bg-green-50 border-green-200 text-green-700",
    barClassName: "bg-green-500",
  };
}

function getUrgencyTone(level?: UrgencyLevel) {
  switch (level) {
    case "EMERGENCY":
      return {
        wrapper: "border-red-200 bg-red-50",
        badge: "bg-red-600 text-white",
        title: "text-red-900",
        text: "text-red-800",
      };
    case "HIGH":
      return {
        wrapper: "border-orange-200 bg-orange-50",
        badge: "bg-orange-600 text-white",
        title: "text-orange-900",
        text: "text-orange-800",
      };
    case "MEDIUM":
      return {
        wrapper: "border-amber-200 bg-amber-50",
        badge: "bg-amber-500 text-white",
        title: "text-amber-900",
        text: "text-amber-800",
      };
    case "LOW":
      return {
        wrapper: "border-green-200 bg-green-50",
        badge: "bg-green-600 text-white",
        title: "text-green-900",
        text: "text-green-800",
      };
    default:
      return {
        wrapper: "border-slate-200 bg-slate-50",
        badge: "bg-slate-600 text-white",
        title: "text-slate-900",
        text: "text-slate-700",
      };
  }
}

function getExplanationSourceLabel(source?: ExplanationResult["source"]) {
  if (source === "rag_llm") return "RAG + LLM";
  if (source === "llm") return "LLM";
  return "Template";
}

function getCfPercent(item: ConsultationResultItem | null | undefined) {
  if (!item) return 0;
  return item.cfPercent ?? item.percentage ?? 0;
}

function getCfFinal(item: ConsultationResultItem | null | undefined) {
  if (!item) return 0;
  return item.cfFinal ?? item.cfResult ?? 0;
}

function truncateText(text: string | null | undefined, max = 160) {
  if (!text) return "-";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function getSourceHost(url: string | null | undefined) {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function buildCfCombineText(
  details: { cfPartial: number }[] | undefined,
  cfFinal: number
) {
  if (!details || details.length === 0) return "-";

  const partials = details.map((detail) => detail.cfPartial);

  const visiblePartials = partials
    .slice(0, 6)
    .map((value) => Number(value).toFixed(2))
    .join(" ⊕ ");

  const suffix = partials.length > 6 ? " ⊕ ..." : "";

  return `${visiblePartials}${suffix} = ${Number(cfFinal).toFixed(2)}`;
}

function AnimatedPercentage({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;

      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(value * easeOut);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    const timer = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return <>{displayValue.toFixed(2)}</>;
}

export default function ConsultationResultPage() {
  const searchParams = useSearchParams();
  const consultationId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConsultationResultState | null>(null);

  useEffect(() => {
    async function loadResult() {
      if (!consultationId) {
        setError("ID konsultasi tidak ditemukan.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetchConsultationById(consultationId);
        console.log("RESULT API RAW", response);

        setResult(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message || "Gagal memuat hasil konsultasi."
            : "Gagal memuat hasil konsultasi."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [consultationId]);

  const normalizedPayload: ConsultationPayload | null = isWrappedResponse(result)
    ? result.data ?? null
    : isPayloadResponse(result)
    ? result
    : null;

  const patientData = normalizedPayload?.consultation ?? null;
  const diagnosisResults = normalizedPayload?.results ?? [];
  const redFlags = normalizedPayload?.redFlags ?? [];
  const urgency = normalizedPayload?.urgency ?? null;
  const explanation = normalizedPayload?.explanation ?? null;
  const retrievedEvidence = explanation?.retrievedEvidence ?? [];

  const disclaimer =
    isWrappedResponse(result) && typeof result.disclaimer === "string"
      ? result.disclaimer
      : "Hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.";

  const topResult = useMemo(() => {
    return diagnosisResults[0] ?? null;
  }, [diagnosisResults]);

  const riskTone = topResult ? getRiskTone(topResult.percentage) : null;
  const urgencyTone = getUrgencyTone(urgency?.level);

  const top3Results =
  normalizedPayload?.top3 ??
  normalizedPayload?.rankedResults?.slice(0, 3) ??
  diagnosisResults.slice(0, 3);

const topCalculationDetails = topResult?.calculationDetails ?? [];

const topCfPercent = topResult?.cfPercent ?? topResult?.percentage ?? 0;

const topCfFinal = topResult?.cfFinal ?? topResult?.cfResult ?? 0;

const cfCombineText = buildCfCombineText(
  topCalculationDetails,
  topCfFinal
);

  return (
  <main className="h-[100dvh] overflow-hidden bg-slate-100 p-3 text-slate-900">
    <div className="mx-auto grid h-full max-w-[1600px] grid-rows-[72px_1fr] gap-3">
      <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            Hybrid Expert System Result
          </p>
          <h1 className="text-xl font-black tracking-tight text-slate-950">
            Hasil Diagnosis Awal Penyakit Anak
          </h1>
          <p className="text-[11px] font-medium text-slate-500">
            Certainty Factor • Red Flag • Urgency Logic • RAG Explanation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Consultation ID
            </p>
            <p className="max-w-[220px] truncate text-[11px] font-bold text-slate-700">
              {patientData?.id || "-"}
            </p>
          </div>

          <Link
            href="/consultation"
            className="rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
          >
            Konsultasi Baru
          </Link>
        </div>
      </header>

      {loading ? (
        <section className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm font-bold text-slate-600">
              Menyusun hasil diagnosis...
            </p>
          </div>
        </section>
      ) : error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </section>
      ) : !normalizedPayload ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Data hasil diagnosis belum tersedia.
        </section>
      ) : (
        <section className="grid min-h-0 grid-cols-[1.05fr_1.05fr_0.9fr] grid-rows-[0.9fr_1.1fr] gap-3">
          {/* TOP-1 DIAGNOSIS */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Top-1 Diagnosis
                </p>
                <h2 className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
                  {topResult?.diseaseName || "Belum ada hasil"}
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {topResult?.diseaseCode || "-"} • {topResult?.matchCount ?? 0} gejala cocok
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                  CF Final
                </p>
                <p className="text-3xl font-black text-blue-700">
                  {topCfPercent.toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Nama
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {patientData?.childName || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Usia
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {formatAge(patientData?.childAgeMonths)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Gender
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {formatGender(patientData?.gender)}
                </p>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Gejala Pendukung Top-1
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {topResult?.supportingSymptoms?.length ? (
                  topResult.supportingSymptoms.slice(0, 7).map((symptom) => (
                    <span
                      key={symptom}
                      className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200"
                    >
                      {symptom}
                    </span>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-slate-500">
                    Belum ada gejala pendukung.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* TOP-3 DIAGNOSIS */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              Ranking Diagnosis
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Top Diagnosis Candidates
            </h2>

            <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 gap-2">
              {top3Results.length > 0 ? (
                top3Results.map((item, index) => {
                  const percent = item.cfPercent ?? item.percentage ?? 0;
                  const finalCf = item.cfFinal ?? item.cfResult ?? 0;

                  return (
                    <div
                      key={item.diseaseCode}
                      className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">
                          #{item.rank ?? index + 1}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                          {percent.toFixed(0)}%
                        </span>
                      </div>

                      <h3 className="mt-3 line-clamp-3 text-base font-black leading-tight text-slate-950">
                        {item.diseaseName}
                      </h3>

                      <p className="mt-2 text-[11px] font-bold text-slate-500">
                        {item.diseaseCode} • Match {item.matchCount}
                      </p>

                      <div className="mt-auto pt-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] font-bold text-slate-500">
                          CF Final: {finalCf}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 flex items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-500">
                  Belum ada kandidat diagnosis.
                </div>
              )}
            </div>
          </div>

          {/* URGENCY & RED FLAG */}
          <div
            className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-sm ${urgencyTone.wrapper}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                  Urgency & Red Flag
                </p>
                <h2 className={`mt-1 text-2xl font-black ${urgencyTone.title}`}>
                  {urgency?.label ?? "Tidak tersedia"}
                </h2>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black ${urgencyTone.badge}`}
              >
                {urgency?.level ?? "-"}
              </span>
            </div>

            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Action
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-800">
                {urgency?.action ?? "-"}
              </p>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Red Flags
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {redFlags.length > 0 ? (
                  redFlags.slice(0, 5).map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-red-700 ring-1 ring-red-100"
                    >
                      {flag}
                    </span>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-slate-500">
                    Tidak ada red flag terdeteksi.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* EXPLANATION */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                  Explanation Layer
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  RAG Evidence Explanation
                </h2>
              </div>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                {getExplanationSourceLabel(explanation?.source)}
              </span>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <div className="space-y-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Ringkasan Hasil
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-slate-700">
                    {explanation?.summary || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Alasan Diagnosis
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-slate-700">
                    {explanation?.whyThisDiagnosis || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Penjelasan Berbasis Evidence
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-slate-700">
                    {explanation?.evidenceBasedExplanation ||
                      "Evidence tambahan belum tersedia."}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                      Evidence Sources
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-blue-700">
                      {retrievedEvidence.length} sources
                    </span>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {retrievedEvidence.length > 0 ? (
                      retrievedEvidence.map((evidence, index) => (
                        <div
                          key={`${evidence.title}-${index}`}
                          className="rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black leading-4 text-slate-900">
                                {index + 1}. {evidence.title}
                              </p>

                              <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                {evidence.sourceName || "Unknown source"} •{" "}
                                {getSourceHost(evidence.sourceUrl) || evidence.sourceType}
                              </p>

                              {evidence.evidenceDoi && (
                                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                  DOI: {evidence.evidenceDoi}
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                              {Number(evidence.score ?? 0).toFixed(2)}
                            </span>
                          </div>

                          {evidence.sourceUrl && (
                            <a
                              href={evidence.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-[10px] font-bold text-blue-700 underline underline-offset-2"
                            >
                              Open source
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] font-semibold text-slate-600">
                        Evidence belum tersedia. Sistem menggunakan template explanation.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                    Langkah Berikutnya
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-slate-700">
                    {explanation?.nextStep || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CF TABLE */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              Certainty Factor Calculation
            </p>

            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">
                Detail Perhitungan CF Top-1
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                CF Final: {topCfFinal}
              </p>
            </div>

            <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-2 py-1.5">Gejala</th>
                    <th className="px-2 py-1.5">MB</th>
                    <th className="px-2 py-1.5">MD</th>
                    <th className="px-2 py-1.5">CF Exp</th>
                    <th className="px-2 py-1.5">User</th>
                    <th className="px-2 py-1.5">Partial</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {topCalculationDetails.length > 0 ? (
                    topCalculationDetails.slice(0, 6).map((detail) => (
                      <tr key={detail.symptomCode} className="align-top">
                        <td className="px-2 py-1.5 font-bold text-slate-700">
                          <span>{detail.symptomCode}</span>
                          <br />
                          <span className="font-medium text-slate-500">
                            {truncateText(detail.symptomName, 38)}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">{detail.mb}</td>
                        <td className="px-2 py-1.5">{detail.md}</td>
                        <td className="px-2 py-1.5">{detail.cfExpert}</td>
                        <td className="px-2 py-1.5">{detail.cfUser}</td>
                        <td className="px-2 py-1.5 font-black text-blue-700">
                          {detail.cfPartial}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-xs font-bold text-slate-500"
                      >
                        Detail perhitungan belum tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                CF Combine
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-800">
                {cfCombineText}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                CF Expert = MB - MD; CF Partial = CF Expert × CF User; CF Final dihitung
                menggunakan CF Combine.
              </p>
            </div>
          </div>

          {/* RESEARCH SNAPSHOT */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
              Research Snapshot
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Knowledge Base
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  Saputra et al. 2022
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  CF Formula
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  MB - MD
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Ranking Rule
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  CF + Match Count
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  RAG Role
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  Explanation Only
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Evidence
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {retrievedEvidence.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Source
                </p>
                <p className="mt-1 truncate text-xs font-black text-slate-900">
                  {getExplanationSourceLabel(explanation?.source)}
                </p>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 rounded-2xl bg-white/70 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Guardrail
              </p>

              <p className="mt-2 text-[11px] font-semibold leading-5 text-amber-900">
                Diagnosis, ranking, red flag, dan urgency dihitung oleh inference engine.
                RAG hanya digunakan sebagai explanation layer dan tidak mengubah hasil CF.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  </main>
);
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function ExplanationBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {content || "-"}
      </p>
    </div>
  );
}

function EvidenceCard({
  evidence,
  index,
}: {
  evidence: ExplanationEvidence;
  index: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Evidence #{index + 1}
          </p>
          <h4 className="mt-1 text-sm font-bold text-slate-950">
            {evidence.title}
          </h4>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
          {evidence.score}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
        {evidence.sourceName && (
          <p>
            <span className="font-semibold text-slate-800">Sumber:</span>{" "}
            {evidence.sourceName}
          </p>
        )}

        <p>
          <span className="font-semibold text-slate-800">Tipe:</span>{" "}
          {evidence.sourceType}
        </p>

        {evidence.evidenceDoi && (
          <p>
            <span className="font-semibold text-slate-800">DOI:</span>{" "}
            {evidence.evidenceDoi}
          </p>
        )}

        {evidence.sourceUrl && (
          <p className="break-all">
            <span className="font-semibold text-slate-800">URL:</span>{" "}
            <a
              href={evidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-700 underline underline-offset-2"
            >
              {evidence.sourceUrl}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function ResearchTopDiagnosisCard({
  topResult,
  patientData,
  disclaimer,
}: {
  topResult: ConsultationResultItem | null;
  patientData: ConsultationPayload["consultation"] | null;
  disclaimer: string;
}) {
  const percent = getCfPercent(topResult);

  return (
    <div className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Top-1 Diagnosis
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">
            {topResult?.diseaseName || "Belum ada hasil"}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {topResult?.diseaseCode || "-"} • {topResult?.matchCount ?? 0} gejala cocok
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
            CF Final
          </p>
          <p className="text-4xl font-black text-blue-700">
            {percent.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniStat label="Nama" value={patientData?.childName || "-"} />
        <MiniStat label="Usia" value={formatAge(patientData?.childAgeMonths)} />
        <MiniStat label="Gender" value={formatGender(patientData?.gender)} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Gejala Pendukung Top-1
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topResult?.supportingSymptoms?.length ? (
            topResult.supportingSymptoms.slice(0, 6).map((symptom) => (
              <span
                key={symptom}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
              >
                {symptom}
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-500">Belum ada gejala pendukung.</p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Decision Basis
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-700">
            Top-1 dipilih berdasarkan nilai CF Final tertinggi, kemudian jumlah
            gejala cocok jika terjadi nilai CF yang sama.
          </p>
        </div>

        <p className="mt-2 text-[10px] leading-4 text-slate-500">
          {disclaimer}
        </p>
      </div>
    </div>
  );
}

function ResearchTop3Card({
  results,
}: {
  results: ConsultationResultItem[];
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">
        Ranking Diagnosis
      </p>
      <h2 className="mt-1 text-xl font-black text-slate-950">
        Top-3 Diagnosis
      </h2>

      <div className="mt-4 grid flex-1 grid-cols-3 gap-3">
        {results.map((item, index) => {
          const percent = getCfPercent(item);
          const finalCf = getCfFinal(item);

          return (
            <div
              key={item.diseaseCode}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  #{item.rank ?? index + 1}
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {percent.toFixed(0)}%
                </span>
              </div>

              <h3 className="mt-4 text-lg font-black leading-tight text-slate-950">
                {item.diseaseName}
              </h3>

              <p className="mt-2 text-xs font-bold text-slate-500">
                {item.diseaseCode} • Match {item.matchCount}
              </p>

              <div className="mt-auto pt-4">
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-500">
                  CF Final: {finalCf}
                </p>
              </div>
            </div>
          );
        })}

        {results.length === 0 && (
          <div className="col-span-3 flex items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-500">
            Belum ada kandidat diagnosis.
          </div>
        )}
      </div>
    </div>
  );
}

function ResearchUrgencyCard({
  urgency,
  redFlags,
}: {
  urgency: UrgencyResult | null;
  redFlags: string[];
}) {
  const tone = getUrgencyTone(urgency?.level);

  return (
    <div className={`flex min-h-0 flex-col rounded-3xl border p-5 shadow-sm ${tone.wrapper}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70">
            Urgency & Red Flag
          </p>
          <h2 className={`mt-2 text-3xl font-black ${tone.title}`}>
            {urgency?.label ?? "Tidak tersedia"}
          </h2>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
          {urgency?.level ?? "-"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Action
        </p>
        <p className="mt-2 text-sm font-semibold leading-5 text-slate-800">
          {urgency?.action ?? "-"}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Red Flags
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {redFlags.length > 0 ? (
            redFlags.slice(0, 5).map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-white px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-100"
              >
                {flag}
              </span>
            ))
          ) : (
            <p className="text-xs font-semibold text-slate-500">
              Tidak ada red flag terdeteksi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResearchExplanationCard({
  explanation,
}: {
  explanation: ExplanationResult | null;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">
            Explanation Layer
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            RAG / Template Explanation
          </h2>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          {getExplanationSourceLabel(explanation?.source)}
        </span>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 grid-rows-[auto_auto_auto] gap-3">
        <CompactTextBlock
          title="Ringkasan"
          content={truncateText(explanation?.summary, 180)}
        />
        <CompactTextBlock
          title="Mengapa hasil muncul?"
          content={truncateText(explanation?.whyThisDiagnosis, 220)}
        />
        <CompactTextBlock
          title="Langkah berikutnya"
          content={truncateText(explanation?.nextStep, 200)}
          tone="blue"
        />
      </div>
    </div>
  );
}

function ResearchCfTable({
  topResult,
}: {
  topResult: ConsultationResultItem | null;
}) {
  const details = topResult?.calculationDetails ?? [];

  return (
    <div className="col-span-1 flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">
        Certainty Factor Calculation
      </p>

      <div className="mt-1 flex items-end justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">
          Detail Perhitungan CF
        </h2>
        <p className="text-xs font-bold text-slate-500">
          CF Final: {getCfFinal(topResult)}
        </p>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200">
        <table className="h-full w-full text-left text-[11px]">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-2 py-2">Gejala</th>
              <th className="px-2 py-2">MB</th>
              <th className="px-2 py-2">MD</th>
              <th className="px-2 py-2">CF Exp</th>
              <th className="px-2 py-2">CF User</th>
              <th className="px-2 py-2">Partial</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {details.slice(0, 6).map((detail) => (
              <tr key={detail.symptomCode} className="align-top">
                <td className="px-2 py-2 font-bold text-slate-700">
                  <span>{detail.symptomCode}</span>
                  <br />
                  <span className="font-medium text-slate-500">
                    {truncateText(detail.symptomName, 42)}
                  </span>
                </td>
                <td className="px-2 py-2">{detail.mb}</td>
                <td className="px-2 py-2">{detail.md}</td>
                <td className="px-2 py-2">{detail.cfExpert}</td>
                <td className="px-2 py-2">{detail.cfUser}</td>
                <td className="px-2 py-2 font-black text-blue-700">
                  {detail.cfPartial}
                </td>
              </tr>
            ))}

            {details.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs font-bold text-slate-500">
                  Detail perhitungan belum tersedia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Rumus: CF Expert = MB - MD; CF Partial = CF Expert × CF User; CF Final
        dihitung menggunakan CF Combine.
      </p>
    </div>
  );
}

function ResearchPatientCard({
  patientData,
  diagnosisResults,
  retrievedEvidence,
  explanation,
}: {
  patientData: ConsultationPayload["consultation"] | null;
  diagnosisResults: ConsultationResultItem[];
  retrievedEvidence: ExplanationEvidence[];
  explanation: ExplanationResult | null;
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
        Research Snapshot
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat label="Total Kandidat" value={diagnosisResults.length} />
        <MiniStat label="Evidence" value={retrievedEvidence.length} />
        <MiniStat label="Source" value={getExplanationSourceLabel(explanation?.source)} />
        <MiniStat label="Created" value={patientData?.createdAt ? new Date(patientData.createdAt).toLocaleDateString("id-ID") : "-"} />
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-amber-800">
          Catatan Medis
        </p>
        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-900">
          <li>• Hasil ini adalah identifikasi awal.</li>
          <li>• Diagnosis final tetap membutuhkan dokter.</li>
          <li>• RAG hanya menjelaskan hasil CF, bukan menentukan diagnosis.</li>
        </ul>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function CompactTextBlock({
  title,
  content,
  tone = "slate",
}: {
  title: string;
  content: string;
  tone?: "slate" | "blue";
}) {
  return (
    <div
      className={
        tone === "blue"
          ? "rounded-2xl border border-blue-100 bg-blue-50 p-3"
          : "rounded-2xl border border-slate-200 bg-slate-50 p-3"
      }
    >
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-xs font-medium leading-5 text-slate-700">
        {content || "-"}
      </p>
    </div>
  );
}