"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchConsultationById } from "@/src/lib/api";

type ConsultationResultItem = {
  diseaseCode: string;
  diseaseName: string;
  severityLevel?: string | null;
  cfResult: number;
  percentage: number;
  matchCount: number;
  supportingSymptoms: string[];
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
  results: ConsultationResultItem[];
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Tahap Akhir
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Hasil Diagnosis Awal
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Berikut adalah simpulan dari sistem pakar berbasis Certainty
              Factor, urgency logic, dan RAG explanation berdasarkan gejala yang
              diberikan.
            </p>
          </div>

          <Link
            href="/consultation"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Mulai Konsultasi Baru
          </Link>
        </header>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              Menyusun hasil diagnosis...
            </p>
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
          <>
            <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Diagnosis Paling Memungkinkan
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-950">
                      {topResult?.diseaseName || "Belum ada hasil"}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {disclaimer}
                    </p>
                  </div>

                  {topResult && riskTone && (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-center ${riskTone.className}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide">
                        {riskTone.label}
                      </p>
                      <p className="mt-1 text-3xl font-bold">
                        <AnimatedPercentage value={topResult.percentage} />%
                      </p>
                    </div>
                  )}
                </div>

                {topResult && riskTone && (
                  <div className="mt-6">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${riskTone.barClassName}`}
                        style={{
                          width: `${Math.min(topResult.percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {topResult && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <StatCard label="Kode Penyakit" value={topResult.diseaseCode} />
                    <StatCard label="Nilai CF" value={topResult.cfResult} />
                    <StatCard
                      label="Gejala Cocok"
                      value={`${topResult.matchCount} Gejala`}
                    />
                  </div>
                )}

                {topResult && (
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h3 className="font-semibold text-slate-950">
                        Gejala Pendukung
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {topResult.supportingSymptoms.length > 0 ? (
                          topResult.supportingSymptoms.map((symptom) => (
                            <Pill key={symptom}>{symptom}</Pill>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">
                            Belum ada gejala pendukung yang tercatat.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <h3 className="font-semibold text-blue-950">
                        Saran Medis Awal
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-blue-900">
                        {topResult.advice ||
                          "Belum ada saran awal yang tersedia."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-6">
                {urgency && (
                  <section
                    className={`rounded-3xl border p-5 shadow-sm ${urgencyTone.wrapper}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold opacity-80">
                          Tingkat Urgensi
                        </p>
                        <h3
                          className={`mt-1 text-2xl font-bold ${urgencyTone.title}`}
                        >
                          {urgency.label}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${urgencyTone.badge}`}
                      >
                        {urgency.level}
                      </span>
                    </div>

                    {urgency.reasons.length > 0 && (
                      <div className="mt-4">
                        <p
                          className={`text-sm font-semibold ${urgencyTone.title}`}
                        >
                          Alasan:
                        </p>
                        <ul
                          className={`mt-2 list-disc space-y-1 pl-5 text-sm leading-6 ${urgencyTone.text}`}
                        >
                          {urgency.reasons.map((reason, index) => (
                            <li key={`${reason}-${index}`}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-slate-800">
                      {urgency.action}
                    </div>
                  </section>
                )}

                {redFlags.length > 0 && (
                  <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-bold text-red-700">
                      Tanda Bahaya Terdeteksi
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {redFlags.map((flag) => (
                        <span
                          key={flag}
                          className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </aside>
            </section>

            {explanation && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                      RAG Explanation
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      Penjelasan Berbasis Evidence
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Penjelasan ini dibuat setelah hasil Certainty Factor dan
                      urgency diperoleh. RAG mengambil evidence relevan, lalu LLM
                      menyusun penjelasan tanpa mengubah diagnosis utama.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                    {getExplanationSourceLabel(explanation.source)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <ExplanationBlock
                    title="Ringkasan"
                    content={explanation.summary}
                  />
                  <ExplanationBlock
                    title="Mengapa hasil ini muncul?"
                    content={explanation.whyThisDiagnosis}
                  />
                  <ExplanationBlock
                    title="Penjelasan berbasis evidence"
                    content={
                      explanation.evidenceBasedExplanation ||
                      "Evidence tambahan belum tersedia."
                    }
                  />
                  <ExplanationBlock
                    title="Penjelasan urgensi"
                    content={explanation.urgencyExplanation}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-950">
                    Langkah berikutnya
                  </p>
                  <p className="mt-2 text-sm leading-6 text-blue-900">
                    {explanation.nextStep}
                  </p>
                </div>

                {retrievedEvidence.length > 0 && (
                  <div className="mt-6">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">
                          Evidence yang Digunakan
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Daftar evidence hasil retrieval yang digunakan untuk
                          menyusun penjelasan.
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">
                        Total: {retrievedEvidence.length} evidence
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {retrievedEvidence.map((evidence, index) => (
                        <EvidenceCard
                          key={`${evidence.title}-${index}`}
                          evidence={evidence}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                  {explanation.disclaimer}
                </div>
              </section>
            )}

            {diagnosisResults.length > 1 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Kemungkinan Diagnosis Lainnya
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Alternatif penyakit dengan tingkat kecocokan yang lebih
                    rendah.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {diagnosisResults
                    .slice(1)
                    .map((item: ConsultationResultItem, index: number) => (
                      <ExpandableDiagnosisCard
                        key={item.diseaseCode}
                        item={item}
                        index={index}
                      />
                    ))}
                </div>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">
                  Data Pasien
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StatCard
                    label="Nama anak"
                    value={patientData?.childName || "-"}
                  />
                  <StatCard
                    label="Usia"
                    value={formatAge(patientData?.childAgeMonths)}
                  />
                  <StatCard
                    label="Jenis kelamin"
                    value={formatGender(patientData?.gender)}
                  />
                  <StatCard label="ID Konsultasi" value={patientData?.id || "-"} />
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-amber-900">
                  Peringatan Medis
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">
                  <li>Hasil ini adalah diagnosis awal.</li>
                  <li>Bukan pengganti pemeriksaan dokter.</li>
                  <li>
                    Segera ke IGD atau fasilitas kesehatan bila kondisi anak
                    memburuk.
                  </li>
                </ul>
              </div>
            </section>
          </>
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

function ExpandableDiagnosisCard({
  item,
  index,
}: {
  item: ConsultationResultItem;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tone = getRiskTone(item.percentage);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Peringkat #{index + 2} • {item.diseaseCode}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            {item.diseaseName}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-slate-950">
            {item.percentage.toFixed(2)}%
          </p>
          <p className={`mt-1 rounded-full px-3 py-1 text-xs ${tone.className}`}>
            {tone.label}
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Kode Penyakit" value={item.diseaseCode} />
            <StatCard label="Total CF" value={item.cfResult} />
            <StatCard label="Gejala Cocok" value={`${item.matchCount} Gejala`} />
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold text-slate-950">
              Gejala Pendukung
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {item.supportingSymptoms.length > 0 ? (
                item.supportingSymptoms.map((symptom) => (
                  <Pill key={symptom}>{symptom}</Pill>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Tidak ada gejala pendukung tercatat.
                </p>
              )}
            </div>
          </div>

          {item.advice && (
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">Saran Medis Singkat</p>
              <p className="mt-2">{item.advice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}