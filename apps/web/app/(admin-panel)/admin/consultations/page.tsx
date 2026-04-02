"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type GenderFilter = "all" | "MALE" | "FEMALE";

export default function AdminConsultationsPage() {
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const createdAt = new Date(item.createdAt);

      const matchesSearch =
        keyword === "" ||
        (item.childName || "").toLowerCase().includes(keyword) ||
        String(item.childAgeMonths).includes(keyword) ||
        (item.gender || "").toLowerCase().includes(keyword);

      const matchesGender =
        genderFilter === "all" || item.gender === genderFilter;

      const matchesDateFrom =
        !dateFrom || createdAt >= new Date(`${dateFrom}T00:00:00`);

      const matchesDateTo =
        !dateTo || createdAt <= new Date(`${dateTo}T23:59:59`);

      return matchesSearch && matchesGender && matchesDateFrom && matchesDateTo;
    });
  }, [items, search, genderFilter, dateFrom, dateTo]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin</p>
        <h1 className="text-3xl font-bold">Riwayat Konsultasi</h1>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama anak, usia, gender..."
          className="rounded-lg border px-3 py-2"
        />

        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">Semua Gender</option>
          <option value="MALE">Laki-laki</option>
          <option value="FEMALE">Perempuan</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Menampilkan <strong>{filteredItems.length}</strong> dari{" "}
        <strong>{items.length}</strong> konsultasi
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
              filteredItems.map((item) => (
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

            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  Tidak ada data konsultasi yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && <div className="p-4">Memuat data...</div>}
      </div>
    </div>
  );
}