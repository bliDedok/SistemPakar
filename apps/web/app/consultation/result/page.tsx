"use client";

import { useState } from "react";

type DiagnosisItem = {
  diseaseCode: string;
  diseaseName: string;
  cfResult: number;
  percentage: number;
  matchCount: number;
  supportingSymptoms: string[];
  advice: string | null;
};

type DiagnosisResponse = {
  success: boolean;
  message: string;
  disclaimer: string;
  data: {
    redFlags: string[];
    results: DiagnosisItem[];
  };
};

export default function ConsultationResultPage() {
    const [result] = useState<DiagnosisResponse | null>(() => {
    if (typeof window === "undefined") return null;

    const raw = sessionStorage.getItem("diagnosis_result");
    if (!raw) return null;

    try {
        return JSON.parse(raw) as DiagnosisResponse;
    } catch {
        return null;
    }
    });

  if (!result) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          Data hasil diagnosis belum tersedia.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <p className="text-sm text-gray-500">Hasil</p>
        <h1 className="text-4xl font-bold">Hasil Diagnosis Awal</h1>
        <p className="mt-2 text-gray-600">{result.disclaimer}</p>
      </div>

      {result.data.redFlags.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-red-700">Tanda Bahaya Terdeteksi</h2>
          <ul className="list-disc pl-5 text-red-700">
            {result.data.redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {result.data.results.map((item, index) => (
          <div key={item.diseaseCode} className="rounded-2xl border p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Peringkat #{index + 1}</p>
                <h2 className="text-2xl font-semibold">{item.diseaseName}</h2>
              </div>
              <div className="rounded-full bg-black px-4 py-2 text-white">
                {item.percentage}%
              </div>
            </div>

            <div className="mb-3">
              <p className="mb-1 font-medium">Gejala Pendukung</p>
              <div className="flex flex-wrap gap-2">
                {item.supportingSymptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="rounded-full border border-gray-300 px-3 py-1 text-sm"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 font-medium">Saran Awal</p>
              <p className="text-gray-700">{item.advice || "-"}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}