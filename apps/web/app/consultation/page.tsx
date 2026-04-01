"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSymptoms, submitDiagnosis } from "@/src/lib/api";

type Symptom = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
};

type AnswerValue = 0 | 0.2 | 0.4 | 0.6 | 0.8 | 1;

const confidenceOptions: { label: string; value: AnswerValue }[] = [
  { label: "Tidak", value: 0 },
  { label: "Kurang yakin", value: 0.2 },
  { label: "Sedikit yakin", value: 0.4 },
  { label: "Cukup yakin", value: 0.6 },
  { label: "Yakin", value: 0.8 },
  { label: "Sangat yakin", value: 1 },
];

export default function ConsultationPage() {
  const router = useRouter();

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [childName, setChildName] = useState("");
  const [childAgeMonths, setChildAgeMonths] = useState<number>(24);
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    async function loadSymptoms() {
      try {
        setLoading(true);
        const response = await fetchSymptoms();
        setSymptoms(response.data ?? []);
      } catch (err: unknown) {
        setError("Gagal memuat data gejala.");
      } finally {
        setLoading(false);
      }
    }

    loadSymptoms();
  }, []);

  function handleChangeAnswer(symptomCode: string, value: AnswerValue) {
    setAnswers((prev) => ({
      ...prev,
      [symptomCode]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const formattedAnswers = Object.entries(answers).map(([symptomCode, userCf]) => ({
      symptomCode,
      userCf,
    }));

    if (formattedAnswers.length === 0) {
      setError("Pilih minimal satu gejala terlebih dahulu.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await submitDiagnosis({
        childName,
        childAgeMonths,
        gender,
        answers: formattedAnswers,
      });

      sessionStorage.setItem("diagnosis_result", JSON.stringify(response));
      router.push("/consultation/result");
    } catch (err: unknown) {
      setError((err as Error).message || "Gagal memproses diagnosis.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <p className="text-sm text-gray-500">Konsultasi</p>
        <h1 className="text-4xl font-bold">Diagnosis Awal Berdasarkan Gejala</h1>
        <p className="mt-2 text-gray-600">
          Pilih tingkat keyakinan untuk setiap gejala yang muncul pada anak.
        </p>
      </div>

      {loading && <p>Memuat data gejala...</p>}

      {!loading && error && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {!loading && symptoms.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-2xl border p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Data Anak</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Nama Anak</label>
                <input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Contoh: Alya"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Usia (bulan)</label>
                <input
                  type="number"
                  min={0}
                  value={childAgeMonths}
                  onChange={(e) => setChildAgeMonths(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {symptoms.map((symptom) => (
              <div key={symptom.code} className="rounded-2xl border p-5 shadow-sm">
                <div className="mb-3">
                  <p className="font-semibold">{symptom.name}</p>
                  <p className="text-sm text-gray-600">{symptom.questionText}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {confidenceOptions.map((option) => {
                    const active = answers[symptom.code] === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChangeAnswer(symptom.code, option.value)}
                        className={`rounded-full border px-4 py-2 text-sm ${
                          active
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-black px-6 py-3 text-white disabled:opacity-60"
            >
              {submitting ? "Memproses..." : "Proses Diagnosis"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}