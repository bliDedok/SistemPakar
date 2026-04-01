"use client";

import { useState } from "react";

type DiseaseFormValues = {
  code: string;
  name: string;
  description: string;
  advice: string;
  severityLevel: string;
  sourceUrl: string;
  isActive: boolean;
};

export function DiseaseForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<DiseaseFormValues>;
  onSubmit: (values: DiseaseFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<DiseaseFormValues>({
    code: initialValues?.code || "",
    name: initialValues?.name || "",
    description: initialValues?.description || "",
    advice: initialValues?.advice || "",
    severityLevel: initialValues?.severityLevel || "",
    sourceUrl: initialValues?.sourceUrl || "",
    isActive: initialValues?.isActive ?? true,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await onSubmit(values);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">Code</label>
        <input
          value={values.code}
          onChange={(e) => setValues((prev) => ({ ...prev, code: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Nama Penyakit</label>
        <input
          value={values.name}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Deskripsi</label>
        <textarea
          value={values.description}
          onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          rows={4}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Saran Awal</label>
        <textarea
          value={values.advice}
          onChange={(e) => setValues((prev) => ({ ...prev, advice: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          rows={4}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Severity Level</label>
        <select
          value={values.severityLevel}
          onChange={(e) => setValues((prev) => ({ ...prev, severityLevel: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Pilih severity</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Source URL</label>
        <input
          value={values.sourceUrl}
          onChange={(e) => setValues((prev) => ({ ...prev, sourceUrl: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="https://..."
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues((prev) => ({ ...prev, isActive: e.target.checked }))}
        />
        <span>Aktif</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : submitLabel}
      </button>
    </form>
  );
}