"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RuleForm } from "@/src/components/admin/RuleForm";
import { RuleDetailForm } from "@/src/components/admin/RuleDetailForm";
import {
  addAdminRuleDetail,
  deleteAdminRuleDetail,
  fetchAdminRuleById,
  updateAdminRule,
} from "@/src/lib/api";

type RuleDetail = {
  id: string;
  isMandatory: boolean;
  symptom: {
    code: string;
    name: string;
  };
};

type RuleItem = {
  id: string;
  code: string;
  name: string;
  diseaseId: string;
  operator: "AND" | "OR";
  minMatch: number;
  priority: number;
  isActive: boolean;
  details: RuleDetail[];
};

export default function EditRulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<RuleItem | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const response = await fetchAdminRuleById(params.id);
      setItem(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function handleDeleteDetail(detailId: string) {
    const ok = confirm("Yakin ingin menghapus detail rule ini?");
    if (!ok) return;

    await deleteAdminRuleDetail(params.id, detailId);
    await loadData();
  }

  if (loading) return <div>Memuat data...</div>;
  if (!item) return <div>Rule tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Admin / Rule</p>
        <h1 className="text-3xl font-bold">Edit Rule</h1>
      </div>

      <RuleForm
        initialValues={{
          code: item.code,
          name: item.name,
          diseaseId: item.diseaseId,
          operator: item.operator,
          minMatch: item.minMatch,
          priority: item.priority,
          isActive: item.isActive,
        }}
        submitLabel="Update Rule"
        onSubmit={async (values) => {
          await updateAdminRule(params.id, values);
          router.refresh();
        }}
      />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Detail Gejala Rule</h2>

        <RuleDetailForm
          onSubmit={async (values) => {
            await addAdminRuleDetail(params.id, values);
            await loadData();
          }}
        />

        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Gejala</th>
                <th className="px-4 py-3 text-left">Mandatory</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {item.details.map((detail) => (
                <tr key={detail.id} className="border-t">
                  <td className="px-4 py-3">
                    {detail.symptom.code} - {detail.symptom.name}
                  </td>
                  <td className="px-4 py-3">
                    {detail.isMandatory ? "Ya" : "Tidak"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteDetail(detail.id)}
                      className="rounded border border-red-300 px-3 py-1 text-red-600"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}

              {item.details.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={3}>
                    Belum ada detail gejala untuk rule ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}