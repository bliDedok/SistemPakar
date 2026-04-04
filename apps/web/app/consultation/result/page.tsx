import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type DiagnosisItem = {
  diseaseCode: string;
  diseaseName: string;
  cfResult: number;
  percentage: number;
  matchCount: number;
  supportingSymptoms: string[];
  advice: string | null;
};

type ConsultationResultResponse = {
  success: boolean;
  message: string;
  disclaimer: string;
  data: {
    consultationId: string;
    childName: string | null;
    childAgeMonths: number;
    gender: "MALE" | "FEMALE" | null;
    createdAt: string;
    redFlags: string[];
    results: DiagnosisItem[];
  };
};

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

function getRiskTone(percentage: number) {
  if (percentage >= 80) {
    return {
      label: "Kemungkinan tinggi",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
      barClass: "bg-red-500",
    };
  }

  if (percentage >= 60) {
    return {
      label: "Perlu perhatian",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      barClass: "bg-amber-500",
    };
  }

  return {
    label: "Kemungkinan rendah-menengah",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    barClass: "bg-blue-500",
  };
}

async function fetchConsultationResultById(
  id: string
): Promise<ConsultationResultResponse> {
  const res = await fetch(`${API_BASE_URL}/api/consultations/${id}`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat hasil konsultasi");
  }

  return data;
}

export default async function ConsultationResultPage({
  searchParams,
}: PageProps) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl p-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Hasil konsultasi</p>
          <h1 className="mt-2 text-3xl font-bold">Data hasil diagnosis belum tersedia</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Hasil tidak ditemukan. Silakan ulangi konsultasi dari awal agar sistem dapat
            memproses diagnosis berdasarkan jawaban gejala terbaru.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/consultation"
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Mulai Konsultasi Lagi
            </Link>
            <Link
              href="/"
              className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

    const result = await fetchConsultationResultById(id);
  const topResult = result.data.results[0] ?? null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <div className="mb-8">
        <p className="text-sm text-gray-500">Hasil Konsultasi</p>
        <h1 className="text-4xl font-bold">Hasil Diagnosis Awal</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Berikut hasil diagnosis awal berdasarkan gejala yang Anda pilih. Hasil ini
          digunakan sebagai pendukung identifikasi awal dan bukan pengganti pemeriksaan dokter.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Disclaimer</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">{result.disclaimer}</p>
          </div>

          {result.data.redFlags.length > 0 && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 inline-flex">
                Tanda Bahaya
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-red-900">
                Gejala serius terdeteksi
              </h2>
              <p className="mt-2 text-sm leading-7 text-red-800">
                Segera pertimbangkan pemeriksaan langsung ke tenaga medis atau fasilitas
                kesehatan terdekat.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {result.data.redFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full border border-red-200 bg-white px-3 py-2 text-sm text-red-700"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {result.data.results.map((item, index) => {
              const tone = getRiskTone(item.percentage);

              return (
                <article
                  key={`${item.diseaseCode}-${index}`}
                  className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Peringkat #{index + 1}</p>
                      <h2 className="mt-1 text-2xl font-bold text-gray-900">
                        {item.diseaseName}
                      </h2>
                      <div
                        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${tone.badgeClass}`}
                      >
                        {tone.label}
                      </div>
                    </div>

                    <div className="min-w-36 text-right">
                      <p className="text-sm text-gray-500">Tingkat keyakinan</p>
                      <p className="text-3xl font-bold text-gray-900">{item.percentage}%</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Match gejala: {item.matchCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Keyakinan sistem</span>
                      <span>{item.percentage}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100">
                      <div
                        className={`h-3 rounded-full ${tone.barClass}`}
                        style={{ width: `${Math.max(6, item.percentage)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Gejala Pendukung
                      </h3>
                      {item.supportingSymptoms.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.supportingSymptoms.map((symptom) => (
                            <span
                              key={symptom}
                              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">
                          Belum ada gejala pendukung yang tercatat.
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Saran Awal</h3>
                      <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                        {item.advice || "Belum ada saran awal yang tersedia."}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Ringkasan Hasil</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Jumlah hasil</span>
                <span className="font-medium">{result.data.results.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tanda bahaya</span>
                <span className="font-medium">{result.data.redFlags.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Diagnosis teratas</span>
                <span className="font-medium text-right">
                  {topResult?.diseaseName || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Keyakinan tertinggi</span>
                <span className="font-medium">
                  {topResult ? `${topResult.percentage}%` : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Tindakan Berikutnya</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-gray-600">
              <li>Baca hasil sebagai diagnosis awal, bukan keputusan medis final.</li>
              <li>Jika kondisi anak memburuk, segera ke dokter atau fasilitas kesehatan.</li>
              <li>Simpan hasil ini sebagai bahan konsultasi lanjutan bila diperlukan.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Aksi Cepat</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/consultation"
                className="rounded-full bg-black px-5 py-3 text-center text-sm font-medium text-white"
              >
                Konsultasi Lagi
              </Link>
              <Link
                href="/"
                className="rounded-full border border-gray-300 px-5 py-3 text-center text-sm font-medium text-gray-700"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
