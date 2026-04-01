"use client";

import { useEffect, useState } from "react";
import { fetchAdminSymptoms } from "@/src/lib/api";

type SymptomOption = {
  id: string;
  code: string;
  name: string;
};

export function RuleDetailForm({
  onSubmit,
}: {
  onSubmit: (values: { symptomId: string; isMandatory: boolean }) => Promise<void>;
}) {
  const [symptoms, setSymptoms] = useState<SymptomOption[]>([]);
  const [symptomId, setSymptomId] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRefs() {
      try {
        const response = await fetchAdminSymptoms();
        setSymptoms(response.data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat daftar gejala");
      } finally {
        setLoadingRefs(false);
      }
    }

    loadRefs();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);
      await onSubmit({ symptomId, isMandatory });
      setSymptomId("");
      setIsMandatory(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRefs) return <div>Memuat daftar gejala...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">Gejala</label>
        <select
          value={symptomId}
          onChange={(e) => setSymptomId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Pilih gejala</option>
          {symptoms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} - {item.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isMandatory}
          onChange={(e) => setIsMandatory(e.target.checked)}
        />
        <span>Mandatory</span>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-60"
      >
        {saving ? "Menambahkan..." : "Tambah Detail Rule"}
      </button>
    </form>
  );
}