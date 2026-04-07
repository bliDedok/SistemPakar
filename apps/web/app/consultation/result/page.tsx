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

function AnimatedPercentage({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const duration = 1500; // Durasi animasi 1.5 detik

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

    // Tahan eksekusi penghitungan sesuai dengan 'delay' (dalam milidetik)
    const timer = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timer); // Pembersihan memori
  }, [value, delay]);

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

return (
    <main className="relative min-h-[100dvh] bg-[#F9FAFB] bg-[radial-gradient(#C7BBB5_1px,transparent_1px)] [background-size:24px_24px] px-4 py-8 font-sans overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-white/60"></div>
      
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        <section className="animate-in fade-in slide-in-from-top-4 duration-700 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#C7BBB5]/20">
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
          <section className="rounded-3xl bg-white p-8 shadow-sm text-center border border-[#C7BBB5]/20 animate-in fade-in duration-500">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#DBC3BE] border-t-[#8BA49A]"></span>
            <p className="mt-4 text-sm font-medium text-[#9FABA3]">Menyusun hasil diagnosis...</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-red-100 animate-in fade-in duration-500">
            <div className="rounded-2xl bg-red-50 p-5 text-sm font-medium text-red-700 text-center">
              {error}
            </div>
          </section>
        ) : !result ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm animate-in fade-in duration-500">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 text-center">
              Data hasil diagnosis belum tersedia.
            </div>
          </section>
        ) : (
          <>
            <section className="flex flex-col lg:flex-row gap-6 items-start">
              
              <div className="flex-1 w-full space-y-6">
                
                <div 
                  className="animate-in fade-in zoom-in-[0.95] slide-in-from-bottom-8 duration-700 relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-[#C7BBB5]/20 border border-[#8BA49A]/30 md:p-8"
                  style={{ animationFillMode: 'both', animationDelay: '300ms' }}
                >
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
                          <AnimatedPercentage value={topResult.percentage} delay={800} />%
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

                {diagnosisResults.length > 1 && (
                  <div 
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 rounded-3xl bg-white p-6 shadow-sm border border-[#C7BBB5]/30 md:p-8"
                    style={{ animationFillMode: 'both', animationDelay: '700ms' }}
                  >
                    <div className="mb-6 border-b border-[#C7BBB5]/20 pb-4">
                      <h2 className="text-lg font-bold text-gray-900">Kemungkinan Diagnosis Lainnya</h2>
                      <p className="mt-1 text-sm text-gray-500">Alternatif penyakit dengan tingkat kecocokan yang lebih rendah.</p>
                    </div>

                    <div className="space-y-4">
                      {diagnosisResults.slice(1).map((item: ConsultationResultItem, index: number) => (
                        <ExpandableDiagnosisCard 
                          key={`${item.diseaseCode}-${index}`} 
                          item={item} 
                          index={index} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside 
                className="animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-12 duration-700 relative z-20 flex w-full shrink-0 flex-col rounded-3xl border border-[#C7BBB5]/30 border-t-[6px] border-t-[#DBC3BE] bg-white shadow-lg shadow-[#DBC3BE]/20 lg:sticky lg:top-8 lg:w-[320px]"
                style={{ animationFillMode: 'both', animationDelay: '500ms' }}
              >
                <div className="border-b border-[#C7BBB5]/20 p-6">
                  <h2 className="text-lg font-bold text-gray-900">Data Pasien</h2>
                </div>
                
                <div className="space-y-5 p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Nama anak</p>
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

function ExpandableDiagnosisCard({ item, index }: { item: ConsultationResultItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`group rounded-2xl border transition-all duration-300 ${isOpen ? 'border-[#8BA49A] bg-white shadow-xl shadow-[#8BA49A]/10' : 'border-[#C7BBB5]/30 bg-[#F9FAFB] hover:border-[#DBC3BE] hover:bg-white hover:shadow-lg hover:shadow-[#DBC3BE]/20'}`}>
      <div
        className="flex cursor-pointer flex-wrap items-center justify-between gap-4 p-5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">
            Peringkat #{index + 2} • {item.diseaseCode}
          </p>
          <h3 className={`mt-1 text-[17px] font-bold transition-colors ${isOpen ? 'text-[#8BA49A]' : 'text-gray-900 group-hover:text-[#8BA49A]'}`}>
            {item.diseaseName}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="min-w-[80px] rounded-xl border border-[#C7BBB5]/30 bg-white px-4 py-2 text-right shadow-sm">
            <p className="text-lg font-extrabold text-[#B3B3AC] transition-colors group-hover:text-[#8BA49A]">
              <AnimatedPercentage value={item.percentage} delay={1200} />%
            </p>
          </div>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isOpen ? 'rotate-180 bg-[#DBC3BE]/30 text-[#8BA49A]' : 'bg-gray-200/50 text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-[#C7BBB5]/20 p-5 pt-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9FABA3]">Kode Penyakit</p>
                <p className="mt-1 font-bold text-gray-800">{item.diseaseCode}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9FABA3]">Total CF</p>
                <p className="mt-1 font-bold text-gray-800">{item.cfResult}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9FABA3]">Gejala Cocok</p>
                <p className="mt-1 font-bold text-gray-800">{item.matchCount} Gejala</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Gejala Pendukung</p>
              <div className="flex flex-wrap gap-2">
                {item.supportingSymptoms.length > 0 ? (
                  item.supportingSymptoms.map((symptom, symIdx) => (
                    <span key={symIdx} className="inline-flex items-center gap-1.5 rounded-full border border-[#DBC3BE] bg-[#DBC3BE]/10 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                      {symptom}
                      <span className="flex items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#8BA49A] shadow-sm">
                        CF
                      </span>
                    </span>
                  ))
                ) : (
                  <p className="text-xs italic text-gray-500">Tidak ada gejala pendukung tercatat.</p>
                )}
              </div>
            </div>

            {item.advice && (
              <div className="rounded-xl border border-[#8BA49A]/20 bg-[#8BA49A]/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D847A]">Saran Medis Singkat</p>
                <p className="mt-1 text-sm font-medium text-gray-700">{item.advice}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}