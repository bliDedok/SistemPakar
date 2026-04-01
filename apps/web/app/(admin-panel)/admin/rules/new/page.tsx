"use client";

import { useRouter } from "next/navigation";
import { RuleForm } from "@/src/components/admin/RuleForm";
import { createAdminRule } from "@/src/lib/api";

export default function NewRulePage() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Admin / Rule</p>
        <h1 className="text-3xl font-bold">Tambah Rule</h1>
      </div>

      <RuleForm
        submitLabel="Simpan Rule"
        onSubmit={async (values) => {
          await createAdminRule(values);
          router.push("/admin/rules");
        }}
      />
    </div>
  );
}