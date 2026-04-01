const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function fetchSymptoms() {
  const res = await fetch(`${API_BASE_URL}/api/symptoms`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Gagal memuat data gejala");
  }

  return res.json();
}

export async function submitDiagnosis(payload: {
  childName?: string;
  childAgeMonths: number;
  gender?: "MALE" | "FEMALE";
  answers: { symptomCode: string; userCf: number }[];
}) {
  const res = await fetch(`${API_BASE_URL}/api/consultations/diagnose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memproses diagnosis");
  }

  return data;
}