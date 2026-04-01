"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function AdminDiseasesPage() {
  const [items, setItems] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              items.map((item) => (
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
          </tbody>
        </table>

        {loading && <div className="p-4">Memuat data...</div>}
      </div>
    </div>
  );
}