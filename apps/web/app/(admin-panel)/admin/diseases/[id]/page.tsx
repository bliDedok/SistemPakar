"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DiseaseForm } from "@/src/components/admin/DiseaseForm";
import { fetchAdminDiseaseById, updateAdminDisease } from "@/src/lib/api";

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

export default function EditDiseasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Disease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchAdminDiseaseById(params.id);
        setItem(response.data);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) return <div>Memuat data...</div>;
  if (!item) return <div>Penyakit tidak ditemukan.</div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Penyakit</p>
        <h1 className="text-3xl font-bold">Edit Penyakit</h1>
      </div>

      <DiseaseForm
        initialValues={{
          code: item.code,
          name: item.name,
          description: item.description || "",
          advice: item.advice || "",
          severityLevel: item.severityLevel || "",
          sourceUrl: item.sourceUrl || "",
          isActive: item.isActive,
        }}
        submitLabel="Update Penyakit"
        onSubmit={async (values) => {
          await updateAdminDisease(params.id, values);
          router.push("/admin/diseases");
        }}
      />
    </div>
  );
}