"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/src/lib/api";

type Symptom = {
  id: string;
  code: string;
  name: string;
  questionText: string | null;
  description: string | null;
};

type DiagnosisResult = {
  diseaseId: string;
  scoreCf: number;
  percentage: number;
  disease: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    recommendation: string | null;
  } | null;
};

const confidenceOptions = [
  { label: "Tidak", value: 0 },
  { label: "Sedikit yakin", value: 0.2 },
  { label: "Cukup yakin", value: 0.4 },
  { label: "Yakin", value: 0.6 },
  { label: "Sangat yakin", value: 0.8 },
  { label: "Pasti", value: 1 },
];

export default function ConsultationPage() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<DiagnosisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadSymptoms = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/api/symptoms`);
        const json = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error("Gagal memuat data gejala.");
        }

        setSymptoms(json.data ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan saat memuat gejala."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadSymptoms();
  }, []);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((value) => value > 0).length;
  }, [answers]);

  const handleChangeAnswer = (symptomId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [symptomId]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError("");
      setResults([]);

      const payload = {
        answers: Object.entries(answers).map(([symptomId, confidenceUser]) => ({
          symptomId,
          confidenceUser,
        })),
      };

      const response = await fetch(`${API_BASE_URL}/api/diagnosis/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error("Gagal menjalankan diagnosis.");
      }

      setResults(json.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menjalankan diagnosis."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Konsultasi</p>
          <h1 className="text-3xl font-bold">Diagnosis Awal Berdasarkan Gejala</h1>
          <p className="mt-2 text-muted-foreground">
            Pilih tingkat keyakinan untuk setiap gejala yang muncul pada anak.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border p-6">Memuat gejala...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-600">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border p-4 text-sm text-muted-foreground">
              Gejala terjawab: <span className="font-semibold">{answeredCount}</span> dari{" "}
              <span className="font-semibold">{symptoms.length}</span>
            </div>

            <div className="space-y-4">
              {symptoms.map((symptom) => (
                <div key={symptom.id} className="rounded-2xl border p-5">
                  <p className="text-sm text-muted-foreground">{symptom.code}</p>
                  <h2 className="mt-1 text-lg font-semibold">{symptom.name}</h2>
                  <p className="mt-2 text-sm">
                    {symptom.questionText || symptom.description || "Apakah gejala ini muncul?"}
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {confidenceOptions.map((option) => {
                      const active = (answers[symptom.id] ?? 0) === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChangeAnswer(symptom.id, option.value)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                            active
                              ? "border-black bg-black text-white"
                              : "hover:bg-muted"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Memproses..." : "Jalankan Diagnosis"}
              </button>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold">Hasil Diagnosis</h2>

              {results.length === 0 ? (
                <div className="mt-4 rounded-2xl border p-5 text-muted-foreground">
                  Belum ada hasil. Isi gejala lalu jalankan diagnosis.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {results.map((item, index) => (
                    <div key={item.diseaseId} className="rounded-2xl border p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Ranking #{index + 1}
                          </p>
                          <h3 className="text-xl font-semibold">
                            {item.disease?.name ?? item.diseaseId}
                          </h3>
                          {item.disease?.code ? (
                            <p className="text-sm text-muted-foreground">
                              Kode: {item.disease.code}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold">
                          {item.percentage}%
                        </div>
                      </div>

                      {item.disease?.description ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                          {item.disease.description}
                        </p>
                      ) : null}

                      {item.disease?.recommendation ? (
                        <div className="mt-4 rounded-xl bg-muted p-4">
                          <p className="text-sm font-semibold">Rekomendasi</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.disease.recommendation}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}