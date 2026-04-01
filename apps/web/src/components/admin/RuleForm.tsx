"use client";

import { useEffect, useState } from "react";
import { fetchAdminDiseases } from "@/src/lib/api";

type DiseaseOption = {
  id: string;
  code: string;
  name: string;
};

type RuleFormValues = {
  code: string;
  name: string;
  diseaseId: string;
  operator: "AND" | "OR";
  minMatch: number;
  priority: number;
  isActive: boolean;
};

export function RuleForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<RuleFormValues>;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<RuleFormValues>({
    code: initialValues?.code || "",
    name: initialValues?.name || "",
    diseaseId: initialValues?.diseaseId || "",
    operator: initialValues?.operator || "AND",
    minMatch: initialValues?.minMatch ?? 1,
    priority: initialValues?.priority ?? 0,
    isActive: initialValues?.isActive ?? true,
  });

  const [diseases, setDiseases] = useState<DiseaseOption[]>([]);
  const [error, setError] = useState("");
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRefs() {
      try {
        const response = await fetchAdminDiseases();
        setDiseases(response.data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat daftar penyakit");
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
      await onSubmit(values);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRefs) return <div>Memuat daftar penyakit...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">Code Rule</label>
        <input
          value={values.code}
          onChange={(e) => setValues((prev) => ({ ...prev, code: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Nama Rule</label>
        <input
          value={values.name}
          onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Penyakit</label>
        <select
          value={values.diseaseId}
          onChange={(e) => setValues((prev) => ({ ...prev, diseaseId: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Pilih penyakit</option>
          {diseases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} - {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Operator</label>
          <select
            value={values.operator}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, operator: e.target.value as "AND" | "OR" }))
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Min Match</label>
          <input
            type="number"
            min={1}
            value={values.minMatch}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, minMatch: Number(e.target.value) }))
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Priority</label>
          <input
            type="number"
            value={values.priority}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, priority: Number(e.target.value) }))
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

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
        disabled={saving}
        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : submitLabel}
      </button>
    </form>
  );
}