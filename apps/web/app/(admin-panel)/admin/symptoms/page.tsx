"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteAdminSymptom, fetchAdminSymptoms } from "@/src/lib/api";

type Symptom = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
  isActive: boolean;
};

type StatusFilter = "all" | "active" | "inactive";
type RedFlagFilter = "all" | "yes" | "no";

export default function AdminSymptomsPage() {
  const [items, setItems] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [redFlagFilter, setRedFlagFilter] = useState<RedFlagFilter>("all");

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetchAdminSymptoms();
      setItems(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat gejala");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = confirm("Yakin ingin menghapus gejala ini?");
    if (!ok) return;

    try {
      await deleteAdminSymptom(id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        keyword === "" ||
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.questionText.toLowerCase().includes(keyword) ||
        (item.category || "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);

      const matchesRedFlag =
        redFlagFilter === "all" ||
        (redFlagFilter === "yes" && item.isRedFlag) ||
        (redFlagFilter === "no" && !item.isRedFlag);

      return matchesSearch && matchesStatus && matchesRedFlag;
    });
  }, [items, search, statusFilter, redFlagFilter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin</p>
          <h1 className="text-3xl font-bold">Gejala</h1>
        </div>

        <Link
          href="/admin/symptoms/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Tambah Gejala
        </Link>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari code, nama, pertanyaan, kategori..."
          className="rounded-lg border px-3 py-2"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>

        <select
          value={redFlagFilter}
          onChange={(e) => setRedFlagFilter(e.target.value as RedFlagFilter)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">Semua Red Flag</option>
          <option value="yes">Red Flag</option>
          <option value="no">Bukan Red Flag</option>
        </select>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Menampilkan <strong>{filteredItems.length}</strong> dari{" "}
        <strong>{items.length}</strong> gejala
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
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Red Flag</th>
              <th className="px-4 py-3 text-left">Aktif</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              filteredItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.category || "-"}</td>
                  <td className="px-4 py-3">{item.isRedFlag ? "Ya" : "Tidak"}</td>
                  <td className="px-4 py-3">{item.isActive ? "Aktif" : "Nonaktif"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/symptoms/${item.id}`}
                        className="rounded border px-3 py-1"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded border border-red-300 px-3 py-1 text-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Tidak ada data gejala yang cocok.
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