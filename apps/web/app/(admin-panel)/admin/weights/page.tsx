"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteAdminWeight, fetchAdminWeights } from "@/src/lib/api";

type WeightItem = {
  id: string;
  cfExpert: number;
  note: string | null;
  disease: {
    code: string;
    name: string;
  };
  symptom: {
    code: string;
    name: string;
  };
};

export default function AdminWeightsPage() {
  const [items, setItems] = useState<WeightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetchAdminWeights();
      setItems(response.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat bobot CF");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = confirm("Yakin ingin menghapus bobot CF ini?");
    if (!ok) return;

    try {
      await deleteAdminWeight(id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus bobot CF");
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
          <h1 className="text-3xl font-bold">Bobot CF</h1>
        </div>

        <Link
          href="/admin/weights/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Tambah Bobot
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
              <th className="px-4 py-3 text-left">Penyakit</th>
              <th className="px-4 py-3 text-left">Gejala</th>
              <th className="px-4 py-3 text-left">CF Expert</th>
              <th className="px-4 py-3 text-left">Catatan</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">
                    {item.disease.code} - {item.disease.name}
                  </td>
                  <td className="px-4 py-3">
                    {item.symptom.code} - {item.symptom.name}
                  </td>
                  <td className="px-4 py-3">{item.cfExpert}</td>
                  <td className="px-4 py-3">{item.note || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/weights/${item.id}`}
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
          </tbody>
        </table>

        {loading && <div className="p-4">Memuat data...</div>}
      </div>
    </div>
  );
}