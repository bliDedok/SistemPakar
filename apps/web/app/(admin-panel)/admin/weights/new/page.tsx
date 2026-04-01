"use client";

import { useRouter } from "next/navigation";
import { WeightForm } from "@/src/components/admin/WeightForm";
import { createAdminWeight } from "@/src/lib/api";

export default function NewWeightPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Bobot CF</p>
        <h1 className="text-3xl font-bold">Tambah Bobot CF</h1>
      </div>

      <WeightForm
        submitLabel="Simpan Bobot CF"
        onSubmit={async (values) => {
          await createAdminWeight(values);
          router.push("/admin/weights");
        }}
      />
    </div>
  );
}