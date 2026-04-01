"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SymptomForm } from "@/src/components/admin/SymptomForm";
import { fetchAdminSymptomById, updateAdminSymptom } from "@/src/lib/api";

type Symptom = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
  isActive: boolean;
};

export default function EditSymptomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Symptom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchAdminSymptomById(params.id);
        setItem(response.data);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) return <div>Memuat data...</div>;
  if (!item) return <div>Gejala tidak ditemukan.</div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Gejala</p>
        <h1 className="text-3xl font-bold">Edit Gejala</h1>
      </div>

      <SymptomForm
        initialValues={{
          code: item.code,
          name: item.name,
          questionText: item.questionText,
          category: item.category || "",
          isRedFlag: item.isRedFlag,
          isActive: item.isActive,
        }}
        submitLabel="Update Gejala"
        onSubmit={async (values) => {
          await updateAdminSymptom(params.id, values);
          router.push("/admin/symptoms");
        }}
      />
    </div>
  );
}