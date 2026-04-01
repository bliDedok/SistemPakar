"use client";

import { useRouter } from "next/navigation";
import { SymptomForm } from "@/src/components/admin/SymptomForm";
import { createAdminSymptom } from "@/src/lib/api";

export default function NewSymptomPage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Gejala</p>
        <h1 className="text-3xl font-bold">Tambah Gejala</h1>
      </div>

      <SymptomForm
        submitLabel="Simpan Gejala"
        onSubmit={async (values) => {
          await createAdminSymptom(values);
          router.push("/admin/symptoms");
        }}
      />
    </div>
  );
}