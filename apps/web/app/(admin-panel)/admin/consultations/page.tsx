"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminConsultations } from "@/src/lib/api";

type ConsultationItem = {
  id: string;
  childName: string | null;
  childAgeMonths: number;
  gender: "MALE" | "FEMALE" | null;
  createdAt: string;
  answersCount: number;
  resultsCount: number;
};

export default function AdminConsultationsPage() {
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetchAdminConsultations();
      setItems(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat konsultasi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin</p>
        <h1 className="text-3xl font-bold">Riwayat Konsultasi</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Nama Anak</th>
              <th className="px-4 py-3 text-left">Usia</th>
              <th className="px-4 py-3 text-left">Gender</th>
              <th className="px-4 py-3 text-left">Jawaban</th>
              <th className="px-4 py-3 text-left">Hasil</th>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.childName || "-"}</td>
                  <td className="px-4 py-3">{item.childAgeMonths} bulan</td>
                  <td className="px-4 py-3">{item.gender || "-"}</td>
                  <td className="px-4 py-3">{item.answersCount}</td>
                  <td className="px-4 py-3">{item.resultsCount}</td>
                  <td className="px-4 py-3">
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/consultations/${item.id}`}
                      className="rounded border px-3 py-1"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {loading && <div className="p-4">Memuat data...</div>}
      </div>
    </div>
  );
}