"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WeightForm } from "@/src/components/admin/WeightForm";
import { fetchAdminWeightById, updateAdminWeight } from "@/src/lib/api";

type WeightItem = {
  id: string;
  diseaseId: string;
  symptomId: string;
  cfExpert: number;
  note: string | null;
};

export default function EditWeightPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<WeightItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchAdminWeightById(params.id);
        setItem(response.data);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) return <div>Memuat data...</div>;
  if (!item) return <div>Bobot CF tidak ditemukan.</div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Bobot CF</p>
        <h1 className="text-3xl font-bold">Edit Bobot CF</h1>
      </div>

      <WeightForm
        initialValues={{
          diseaseId: item.diseaseId,
          symptomId: item.symptomId,
          cfExpert: item.cfExpert,
          note: item.note || "",
        }}
        submitLabel="Update Bobot CF"
        onSubmit={async (values) => {
          await updateAdminWeight(params.id, values);
          router.push("/admin/weights");
        }}
      />
    </div>
  );
}