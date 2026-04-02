"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchAdminConsultationById } from "@/src/lib/api";

type ConsultationDetail = {
  id: string;
  childName: string | null;
  childAgeMonths: number;
  gender: "MALE" | "FEMALE" | null;
  createdAt: string;
  answers: {
    id: string;
    userCf: number;
    symptom: {
      code: string;
      name: string;
      questionText: string;
      category: string | null;
      isRedFlag: boolean;
    };
  }[];
  results: {
    id: string;
    rank: number;
    matchCount: number;
    cfResult: number;
    disease: {
      code: string;
      name: string;
      advice: string | null;
      severityLevel: string | null;
    };
  }[];
};

export default function AdminConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchAdminConsultationById(params.id);
        setItem(response.data);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) return <div>Memuat data...</div>;
  if (!item) return <div>Detail konsultasi tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Admin / Konsultasi</p>
        <h1 className="text-3xl font-bold">Detail Konsultasi</h1>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Informasi Anak</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Nama Anak</p>
            <p className="font-medium">{item.childName || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Usia</p>
            <p className="font-medium">{item.childAgeMonths} bulan</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Gender</p>
            <p className="font-medium">{item.gender || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tanggal</p>
            <p className="font-medium">
              {new Date(item.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Jawaban Gejala</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Gejala</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-left">Red Flag</th>
                <th className="px-4 py-3 text-left">User CF</th>
              </tr>
            </thead>
            <tbody>
              {item.answers.map((answer) => (
                <tr key={answer.id} className="border-t">
                  <td className="px-4 py-3">
                    {answer.symptom.code} - {answer.symptom.name}
                  </td>
                  <td className="px-4 py-3">{answer.symptom.category || "-"}</td>
                  <td className="px-4 py-3">
                    {answer.symptom.isRedFlag ? "Ya" : "Tidak"}
                  </td>
                  <td className="px-4 py-3">{answer.userCf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Hasil Diagnosis</h2>
        <div className="space-y-4">
          {item.results.map((result) => (
            <div key={result.id} className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Peringkat #{result.rank}</p>
                  <h3 className="text-lg font-semibold">
                    {result.disease.code} - {result.disease.name}
                  </h3>
                </div>
                <div className="rounded-full bg-black px-4 py-2 text-white">
                  {(result.cfResult * 100).toFixed(2)}%
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">CF Result</p>
                  <p className="font-medium">{result.cfResult}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Match Count</p>
                  <p className="font-medium">{result.matchCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Severity</p>
                  <p className="font-medium">{result.disease.severityLevel || "-"}</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-500">Saran Awal</p>
                <p className="font-medium">{result.disease.advice || "-"}</p>
              </div>
            </div>
          ))}

          {item.results.length === 0 && (
            <div className="text-gray-500">Belum ada hasil diagnosis tersimpan.</div>
          )}
        </div>
      </div>
    </div>
  );
}