"use client";

import { useEffect, useState } from "react";
import { fetchAdminDiseases, fetchAdminSymptoms } from "@/src/lib/api";

type DiseaseOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type SymptomOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type WeightFormValues = {
  diseaseId: string;
  symptomId: string;
  cfExpert: number;
  note: string;
};

export function WeightForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: Partial<WeightFormValues>;
  onSubmit: (values: WeightFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<WeightFormValues>({
    diseaseId: initialValues?.diseaseId || "",
    symptomId: initialValues?.symptomId || "",
    cfExpert: initialValues?.cfExpert ?? 0,
    note: initialValues?.note || "",
  });

  const [diseases, setDiseases] = useState<DiseaseOption[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRefs() {
      try {
        setLoadingRefs(true);
        const [diseaseRes, symptomRes] = await Promise.all([
          fetchAdminDiseases(),
          fetchAdminSymptoms(),
        ]);

        setDiseases(diseaseRes.data ?? []);
        setSymptoms(symptomRes.data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat referensi");
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

  if (loadingRefs) {
    return <div>Memuat referensi penyakit dan gejala...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

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

      <div>
        <label className="mb-2 block text-sm font-medium">Gejala</label>
        <select
          value={values.symptomId}
          onChange={(e) => setValues((prev) => ({ ...prev, symptomId: e.target.value }))}
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

      <div>
        <label className="mb-2 block text-sm font-medium">CF Expert (0 - 1)</label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={values.cfExpert}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, cfExpert: Number(e.target.value) }))
          }
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Catatan</label>
        <textarea
          value={values.note}
          onChange={(e) => setValues((prev) => ({ ...prev, note: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          rows={4}
        />
      </div>

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