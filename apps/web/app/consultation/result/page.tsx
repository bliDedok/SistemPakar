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

function AnimatedPercentage({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const duration = 1500; // Durasi animasi 1.5 detik (1500ms)

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Efek Ease-Out (melambat saat hampir sampai target)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * easeOut);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  // Handle desimal secara otomatis (jika bulat, hilangkan koma)
  const formattedValue = Number.isInteger(value) 
    ? displayValue.toFixed(0) 
    : displayValue.toFixed(2);

  return <>{formattedValue}</>;
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

// ==========================================
  // 1. PERBAIKAN LOGIC PENGAMBILAN DATA
  // ==========================================
  const normalizedPayload: ConsultationPayload | null = isWrappedResponse(result)
    ? result.data ?? null
    : isPayloadResponse(result)
    ? result
    : null;

  // FIX: Mengamankan data. Jika data nama/umur ada di luar objek 'consultation', kita tetap bisa mengambilnya.
  const patientData = normalizedPayload?.consultation || (normalizedPayload as any) || {};

  const diagnosisResults = normalizedPayload?.results ?? [];
  const redFlags = normalizedPayload?.redFlags ?? [];

  const disclaimer =
    isWrappedResponse(result) && typeof result.disclaimer === "string"
      ? result.disclaimer
      : "Hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.";

  const topResult = useMemo(() => {
    return diagnosisResults[0] ?? null;
  }, [diagnosisResults]);

  // ==========================================
  // 2. TAMPILAN UI (Dengan Efek & Palet Warna)
  // ==========================================
  return (
    <main className="relative min-h-[100dvh] bg-[#F9FAFB] bg-[radial-gradient(#C7BBB5_1px,transparent_1px)] [background-size:24px_24px] px-4 py-8 font-sans">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-white/60"></div>
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        
        {/* HEADER SECTION */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#C7BBB5]/20">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#8BA49A]">
              Tahap Akhir
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-gray-900">
              Hasil Diagnosis Awal
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl">
              Berikut adalah simpulan dari sistem pakar AI berdasarkan gejala yang Anda sampaikan.
            </p>
          </div>
          <Link
            href="/consultation"
            className="shrink-0 rounded-full bg-gradient-to-r from-[#8BA49A] to-[#9FABA3] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#8BA49A]/30 transition-all hover:scale-105 hover:from-[#9FABA3] hover:to-[#8BA49A]"
          >
            Mulai Konsultasi Baru
          </Link>
        </section>

        {loading ? (
          <section className="rounded-3xl bg-white p-8 shadow-sm text-center border border-[#C7BBB5]/20">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#DBC3BE] border-t-[#8BA49A]"></span>
            <p className="mt-4 text-sm font-medium text-[#9FABA3]">Menyusun hasil diagnosis...</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-red-100">
            <div className="rounded-2xl bg-red-50 p-5 text-sm font-medium text-red-700 text-center">
              {error}
            </div>
          </section>
        ) : !result ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 text-center">
              Data hasil diagnosis belum tersedia.
            </div>
          </section>
        ) : (
          <>
            <section className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* KOLOM KIRI: HASIL DIAGNOSIS */}
              <div className="flex-1 w-full space-y-6">
                
                {/* KARTU HASIL UTAMA (Dengan Efek Glow) */}
                <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-[#C7BBB5]/20 border border-[#8BA49A]/30 md:p-8">
                  {/* Efek Latar Blur Gradasi (Kiri Atas & Kanan Bawah) */}
                  <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#8BA49A]/15 to-[#DBC3BE]/15 blur-3xl pointer-events-none"></div>
                  <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-gradient-to-tl from-[#DBC3BE]/15 to-[#8BA49A]/15 blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8BA49A]/10 to-transparent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#8BA49A]">
                        <span className="h-2 w-2 rounded-full bg-[#8BA49A] animate-pulse"></span>
                        Diagnosis Paling Memungkinkan
                      </div>
                      <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                        {topResult?.diseaseName || "Belum ada hasil"}
                      </h2>
                      <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                        {disclaimer}
                      </p>
                    </div>

                    {topResult && (
                      <div className={`shrink-0 rounded-3xl border-2 px-6 py-5 text-center shadow-md md:min-w-[170px] ${getRiskTone(topResult.percentage).className}`}>
                        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                          {getRiskTone(topResult.percentage).label}
                        </p>
                        <p className="mt-2 text-4xl font-black tracking-tight">
                          <AnimatedPercentage value={topResult.percentage} />%
                        </p>
                      </div>
                    )}
                  </div>

                  {redFlags.length > 0 && (
                    <div className="relative z-10 mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-red-800">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                        </svg>
                        Tanda Bahaya Terdeteksi!
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {redFlags.map((flag: string) => (
                          <span key={flag} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm border border-red-100">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {topResult && (
                    <div className="relative z-10 mt-8 pt-6 border-t border-[#C7BBB5]/20">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-[#F9FAFB] p-4 border border-[#C7BBB5]/30 shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Kode Penyakit</p>
                          <p className="mt-1 text-[16px] font-bold text-gray-900">{topResult.diseaseCode}</p>
                        </div>
                        <div className="rounded-2xl bg-[#F9FAFB] p-4 border border-[#C7BBB5]/30 shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Nilai CF</p>
                          <p className="mt-1 text-[16px] font-bold text-gray-900">{topResult.cfResult}</p>
                        </div>
                        <div className="rounded-2xl bg-[#F9FAFB] p-4 border border-[#C7BBB5]/30 shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Gejala Cocok</p>
                          <p className="mt-1 text-[16px] font-bold text-gray-900">{topResult.matchCount} Gejala</p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-sm font-bold text-gray-900">Gejala Pendukung</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topResult.supportingSymptoms.length > 0 ? (
                            topResult.supportingSymptoms.map((symptom) => (
                              <span key={symptom} className="rounded-full border border-[#DBC3BE] bg-[#DBC3BE]/15 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm">
                                {symptom}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic">Belum ada gejala pendukung yang tercatat.</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border-2 border-[#8BA49A]/30 bg-gradient-to-br from-[#8BA49A]/5 to-transparent p-5 shadow-inner">
                        <h3 className="text-sm font-bold text-[#6D847A] flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                          </svg>
                          Saran Medis Awal
                        </h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-gray-800 font-medium">
                          {topResult.advice || "Belum ada saran awal yang tersedia."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* KARTU KEMUNGKINAN LAIN (Peringkat) */}
                {diagnosisResults.length > 1 && (
                  <div className="rounded-3xl bg-white p-6 shadow-sm border border-[#C7BBB5]/30 md:p-8">
                    <div className="mb-6 border-b border-[#C7BBB5]/20 pb-4">
                      <h2 className="text-lg font-bold text-gray-900">Kemungkinan Diagnosis Lainnya</h2>
                      <p className="mt-1 text-sm text-gray-500">Alternatif penyakit dengan tingkat kecocokan yang lebih rendah.</p>
                    </div>

                    <div className="space-y-4">
                      {diagnosisResults.slice(1).map((item: ConsultationResultItem, index: number) => (
                        // EFEK HOVER: Kartu akan sedikit naik dan bayangannya menebal saat disentuh mouse
                        <div key={`${item.diseaseCode}-${index}`} className="group rounded-2xl border border-[#C7BBB5]/30 bg-[#F9FAFB] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#DBC3BE] hover:bg-white hover:shadow-lg hover:shadow-[#DBC3BE]/20">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">
                                Peringkat #{index + 2} • {item.diseaseCode}
                              </p>
                              <h3 className="mt-1 text-[17px] font-bold text-gray-900 group-hover:text-[#8BA49A] transition-colors">
                                {item.diseaseName}
                              </h3>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-2 shadow-sm border border-[#C7BBB5]/30 text-right min-w-[80px]">
                              <p className="text-lg font-extrabold text-[#B3B3AC] group-hover:text-[#8BA49A] transition-colors">
                                <AnimatedPercentage value={item.percentage} />%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* KOLOM KANAN: STATUS PASIEN */}
              <aside className="relative z-20 flex w-full shrink-0 flex-col rounded-3xl border border-[#C7BBB5]/30 border-t-[6px] border-t-[#DBC3BE] bg-white shadow-lg shadow-[#DBC3BE]/20 lg:sticky lg:top-8 lg:w-[320px]">                <div className="border-b border-[#C7BBB5]/20 p-6">
                  <h2 className="text-lg font-bold text-gray-900">Data Pasien</h2>
                </div>
                
                <div className="space-y-5 p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Nama anak</p>
                    {/* Menggunakan variabel patientData yang sudah diperbaiki */}
                    <p className="mt-1 text-[15px] font-semibold text-gray-800">{patientData?.childName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Usia</p>
                    <p className="mt-1 text-[15px] font-semibold text-gray-800">
                      {patientData?.childAgeMonths === null || patientData?.childAgeMonths === undefined
                        ? "-" 
                        : (() => {
                            const y = Math.floor(patientData.childAgeMonths / 12);
                            const m = patientData.childAgeMonths % 12;
                            return y > 0 ? (m > 0 ? `${y} tahun ${m} bulan` : `${y} tahun`) : `${m} bulan`;
                          })()
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Jenis kelamin</p>
                    <p className="mt-1 text-[15px] font-semibold text-gray-800">{formatGender(patientData?.gender)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">ID Konsultasi</p>
                    <p className="mt-1 text-[13px] font-mono text-gray-500 break-all">{patientData?.id || "-"}</p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-inner">
                    <h3 className="text-sm font-bold text-amber-900">Peringatan Medis</h3>
                    <ul className="ml-4 mt-2 list-disc space-y-2 text-xs text-amber-800">
                      <li>Hasil ini adalah diagnosis awal.</li>
                      <li>Bukan pengganti pemeriksaan dokter.</li>
                      <li>Segera ke IGD jika kondisi memburuk.</li>
                    </ul>
                  </div>
                </div>
              </aside>

            </section>
          </>
        )}
      </div>
    </main>
  );
}