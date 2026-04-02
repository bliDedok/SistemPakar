"use client";

import { useEffect, useState } from "react";
import { AdminStatCard } from "@/src/components/admin/AdminStatCard";
import { fetchAdminDashboardStats } from "@/src/lib/api";

type DashboardStats = {
  totalSymptoms: number;
  activeSymptoms: number;
  totalDiseases: number;
  activeDiseases: number;
  totalWeights: number;
  totalRules: number;
  activeRules: number;
  totalConsultations: number;
  consultationsLast7Days: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const response = await fetchAdminDashboardStats();
      setStats(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Admin</p>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Ringkasan data sistem pakar dan aktivitas konsultasi.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          Memuat statistik dashboard...
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminStatCard
              label="Total Gejala"
              value={stats.totalSymptoms}
              helperText={`Gejala aktif: ${stats.activeSymptoms}`}
            />
            <AdminStatCard
              label="Total Penyakit"
              value={stats.totalDiseases}
              helperText={`Penyakit aktif: ${stats.activeDiseases}`}
            />
            <AdminStatCard
              label="Total Bobot CF"
              value={stats.totalWeights}
              helperText="Relasi penyakit dan gejala"
            />
            <AdminStatCard
              label="Total Rule"
              value={stats.totalRules}
              helperText={`Rule aktif: ${stats.activeRules}`}
            />
            <AdminStatCard
              label="Total Konsultasi"
              value={stats.totalConsultations}
              helperText="Seluruh riwayat konsultasi tersimpan"
            />
            <AdminStatCard
              label="Konsultasi 7 Hari Terakhir"
              value={stats.consultationsLast7Days}
              helperText="Aktivitas terbaru sistem"
            />
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Ringkasan Cepat</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Knowledge Base</p>
                <p className="mt-2 text-base text-gray-800">
                  Sistem saat ini memiliki <strong>{stats.totalSymptoms}</strong> gejala,{" "}
                  <strong>{stats.totalDiseases}</strong> penyakit,{" "}
                  <strong>{stats.totalWeights}</strong> bobot CF, dan{" "}
                  <strong>{stats.totalRules}</strong> rule.
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Aktivitas Konsultasi</p>
                <p className="mt-2 text-base text-gray-800">
                  Total konsultasi yang sudah tersimpan adalah{" "}
                  <strong>{stats.totalConsultations}</strong>, dengan{" "}
                  <strong>{stats.consultationsLast7Days}</strong> konsultasi dalam 7 hari
                  terakhir.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}