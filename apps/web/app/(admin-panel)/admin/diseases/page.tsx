"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteAdminDisease, fetchAdminDiseases } from "@/src/lib/api";

type Disease = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  advice: string | null;
  severityLevel: string | null;
  sourceUrl: string | null;
  isActive: boolean;
};

type StatusFilter = "all" | "active" | "inactive";
type SeverityFilter = "all" | "low" | "medium" | "high" | "critical";

export default function AdminDiseasesPage() {
  const [items, setItems] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetchAdminDiseases();
      setItems(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat penyakit");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = confirm("Yakin ingin menonaktifkan penyakit ini?");
    if (!ok) return;

    try {
      await deleteAdminDisease(id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menonaktifkan");
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
        (item.description || "").toLowerCase().includes(keyword) ||
        (item.advice || "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);

      const matchesSeverity =
        severityFilter === "all" || item.severityLevel === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [items, search, statusFilter, severityFilter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin</p>
          <h1 className="text-3xl font-bold">Penyakit</h1>
        </div>

        <Link
          href="/admin/diseases/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Tambah Penyakit
        </Link>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari code, nama, deskripsi, saran..."
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
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">Semua Severity</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Menampilkan <strong>{filteredItems.length}</strong> dari{" "}
        <strong>{items.length}</strong> penyakit
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
              <th className="px-4 py-3 text-left">Severity</th>
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
                  <td className="px-4 py-3">{item.severityLevel || "-"}</td>
                  <td className="px-4 py-3">{item.isActive ? "Aktif" : "Nonaktif"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/diseases/${item.id}`}
                        className="rounded border px-3 py-1"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded border border-red-300 px-3 py-1 text-red-600"
                      >
                        Nonaktifkan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Tidak ada data penyakit yang cocok.
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