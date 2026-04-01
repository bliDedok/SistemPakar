"use client";

import { useRouter } from "next/navigation";
import { DiseaseForm } from "@/src/components/admin/DiseaseForm";
import { createAdminDisease } from "@/src/lib/api";

export default function NewDiseasePage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Penyakit</p>
        <h1 className="text-3xl font-bold">Tambah Penyakit</h1>
      </div>

      <DiseaseForm
        submitLabel="Simpan Penyakit"
        onSubmit={async (values) => {
          await createAdminDisease(values);
          router.push("/admin/diseases");
        }}
      />
    </div>
  );
}