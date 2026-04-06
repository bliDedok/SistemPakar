"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchConsultationById } from "@/src/lib/api";

type ConsultationResultItem = {
  diseaseCode: string;
  diseaseName: string;
  cfResult: number;
  percentage: number;
  matchCount: number;
  supportingSymptoms: string[];
  advice: string | null;
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
  results: ConsultationResultItem[];
};

type ConsultationDetailResponse = {
  success?: boolean;
  message?: string;
  disclaimer?: string;
  data?: ConsultationPayload;
};

type ConsultationResultState = ConsultationDetailResponse | ConsultationPayload;

function getRiskTone(percentage: number) {
  if (percentage >= 80) {
    return {
      label: "Kemungkinan tinggi",
      className: "bg-red-50 border-red-200 text-red-700",
    };
  }

  if (percentage >= 50) {
    return {
      label: "Perlu perhatian",
      className: "bg-amber-50 border-amber-200 text-amber-700",
    };
  }

  return {
    label: "Kemungkinan rendah",
    className: "bg-green-50 border-green-200 text-green-700",
  };
}

function formatGender(value: "MALE" | "FEMALE" | null | undefined) {
  if (value === "MALE") return "Laki-laki";
  if (value === "FEMALE") return "Perempuan";
  return "-";
}

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

  const consultation = normalizedPayload?.consultation ?? null;
  const diagnosisResults = normalizedPayload?.results ?? [];
  const redFlags = normalizedPayload?.redFlags ?? [];

  const disclaimer =
  isWrappedResponse(result) && typeof result.disclaimer === "string"
    ? result.disclaimer
    : "Hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.";

  const topResult = useMemo(() => {
  return diagnosisResults[0] ?? null;
  }, [diagnosisResults]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Hasil Konsultasi
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Hasil Diagnosis Awal
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Halaman ini menampilkan hasil akhir dari sistem pakar setelah data
            pengguna dipahami oleh AI dan diproses oleh mesin inferensi.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/consultation"
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black"
            >
              Kembali ke konsultasi
            </Link>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
              Memuat hasil konsultasi...
            </div>
          </section>
        ) : error ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          </section>
        ) : !result ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Data hasil diagnosis belum tersedia.
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Hasil utama</p>
                    <h2 className="mt-1 text-2xl font-bold text-gray-900">
                      {topResult?.diseaseName || "Belum ada hasil"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {disclaimer}
                    </p>
                  </div>

                  {topResult && (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-right ${
                        getRiskTone(topResult.percentage).className
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide">
                        {getRiskTone(topResult.percentage).label}
                      </p>
                      <p className="mt-1 text-3xl font-bold">
                        {topResult.percentage}%
                      </p>
                    </div>
                  )}
                </div>

                {redFlags.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <h3 className="text-sm font-semibold text-red-900">
                      Tanda bahaya terdeteksi
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {redFlags.map((flag: string) => (
                        <span
                          key={flag}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-red-700"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {topResult && (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Kode Penyakit
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {topResult.diseaseCode}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Nilai CF
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {topResult.cfResult}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Gejala Cocok
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {topResult.matchCount}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gejala pendukung
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {topResult.supportingSymptoms.length > 0 ? (
                          topResult.supportingSymptoms.map((symptom) => (
                            <span
                              key={symptom}
                              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                            >
                              {symptom}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600">
                            Belum ada gejala pendukung yang tercatat.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <h3 className="text-sm font-semibold text-blue-900">
                        Saran awal
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-blue-800">
                        {topResult.advice || "Belum ada saran awal yang tersedia."}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <aside className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Konsultasi
                </h2>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Nama anak
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {consultation?.childName || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Usia
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {consultation?.childAgeMonths ?? "-"} bulan
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Jenis kelamin
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatGender(consultation?.gender)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      ID konsultasi
                    </p>
                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                      {consultation?.id || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">
                    Penting
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm text-amber-800">
                    <li>Hasil ini adalah diagnosis awal.</li>
                    <li>Bukan pengganti pemeriksaan dokter.</li>
                    <li>
                      Jika gejala memburuk atau ada tanda bahaya, segera ke fasilitas
                      kesehatan.
                    </li>
                  </ul>
                </div>
              </aside>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Peringkat Diagnosis
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Sistem menampilkan beberapa kemungkinan hasil berdasarkan nilai
                  certainty factor tertinggi.
                </p>
              </div>

              <div className="space-y-4">
                {diagnosisResults.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    Belum ada hasil diagnosis yang dapat ditampilkan.
                  </div>
                ) : (
                  diagnosisResults.map((item: ConsultationResultItem, index: number) => (
                    <div
                      key={`${item.diseaseCode}-${index}`}
                      className="rounded-2xl border border-gray-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Peringkat #{index + 1}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-gray-900">
                            {item.diseaseName}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Kode: {item.diseaseCode}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-gray-100 px-4 py-3 text-right">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Persentase
                          </p>
                          <p className="mt-1 text-2xl font-bold text-gray-900">
                            {item.percentage}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Gejala pendukung
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.supportingSymptoms.map((symptom) => (
                              <span
                                key={symptom}
                                className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Saran awal
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-gray-700">
                            {item.advice || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}