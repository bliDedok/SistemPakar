"use client";

import { useState } from "react";

type SymptomFormValues = {
  code: string;
  name: string;
  questionText: string;
  category: string;
  isRedFlag: boolean;
  isActive: boolean;
};

export function SymptomForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<SymptomFormValues>;
  onSubmit: (values: SymptomFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<SymptomFormValues>({
    code: initialValues?.code || "",
    name: initialValues?.name || "",
    questionText: initialValues?.questionText || "",
    category: initialValues?.category || "",
    isRedFlag: initialValues?.isRedFlag ?? false,
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
        <label className="mb-2 block text-sm font-medium">Nama Gejala</label>
        <input
          value={values.name}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Pertanyaan</label>
        <textarea
          value={values.questionText}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, questionText: e.target.value }))
          }
          className="w-full rounded-lg border px-3 py-2"
          rows={4}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Kategori</label>
        <input
          value={values.category}
          onChange={(e) => setValues((prev) => ({ ...prev, category: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="respiratory / digestive / general"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={values.isRedFlag}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, isRedFlag: e.target.checked }))
          }
        />
        <span>Tanda bahaya</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, isActive: e.target.checked }))
          }
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