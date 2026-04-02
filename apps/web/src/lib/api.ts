const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function fetchSymptoms() {
  const res = await fetch(`${API_BASE_URL}/api/symptoms`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat data gejala");
  }

  return data;
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

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("admin_token") || "";
}

export async function adminLogin(payload: {
  username: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Login gagal");
  }

  return data;
}

export function logoutAdmin() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
  }
}

export async function fetchAdminSymptoms() {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/symptoms`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat data gejala admin");
  }

  return data;
}

export async function fetchAdminSymptomById(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/symptoms/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat detail gejala");
  }

  return data;
}

export async function createAdminSymptom(payload: {
  code: string;
  name: string;
  questionText: string;
  category?: string;
  isRedFlag: boolean;
  isActive: boolean;
}) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/symptoms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menambah gejala");
  }

  return data;
}

export async function updateAdminSymptom(
  id: string,
  payload: {
    code: string;
    name: string;
    questionText: string;
    category?: string;
    isRedFlag: boolean;
    isActive: boolean;
  }
) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/symptoms/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal mengubah gejala");
  }

  return data;
}

export async function deleteAdminSymptom(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/symptoms/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menghapus gejala");
  }

  return data;
}

// API Disease Admin 

export async function fetchAdminDiseases() {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/diseases`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat data penyakit");
  }

  return data;
}

export async function fetchAdminDiseaseById(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/diseases/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat detail penyakit");
  }

  return data;
}

export async function createAdminDisease(payload: {
  code: string;
  name: string;
  description?: string;
  advice?: string;
  severityLevel?: string;
  sourceUrl?: string;
  isActive: boolean;
}) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/diseases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menambah penyakit");
  }

  return data;
}

export async function updateAdminDisease(
  id: string,
  payload: {
    code: string;
    name: string;
    description?: string;
    advice?: string;
    severityLevel?: string;
    sourceUrl?: string;
    isActive: boolean;
  }
) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/diseases/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal mengubah penyakit");
  }

  return data;
}

export async function deleteAdminDisease(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/diseases/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menonaktifkan penyakit");
  }

  return data;
}




// API CF Weights Admin
export async function fetchAdminWeights() {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/weights`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat bobot CF");
  }

  return data;
}

export async function fetchAdminWeightById(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/weights/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat detail bobot CF");
  }

  return data;
}

export async function createAdminWeight(payload: {
  diseaseId: string;
  symptomId: string;
  cfExpert: number;
  note?: string;
}) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/weights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menambah bobot CF");
  }

  return data;
}

export async function updateAdminWeight(
  id: string,
  payload: {
    diseaseId: string;
    symptomId: string;
    cfExpert: number;
    note?: string;
  }
) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/weights/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal mengubah bobot CF");
  }

  return data;
}

export async function deleteAdminWeight(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/weights/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menghapus bobot CF");
  }

  return data;
}

// API Rules Admin
export async function fetchAdminRules() {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat data rule");
  }

  return data;
}

export async function fetchAdminRuleById(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat detail rule");
  }

  return data;
}

export async function createAdminRule(payload: {
  code: string;
  name: string;
  diseaseId: string;
  operator: "AND" | "OR";
  minMatch: number;
  priority: number;
  isActive: boolean;
}) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menambah rule");
  }

  return data;
}

export async function updateAdminRule(
  id: string,
  payload: {
    code: string;
    name: string;
    diseaseId: string;
    operator: "AND" | "OR";
    minMatch: number;
    priority: number;
    isActive: boolean;
  }
) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal mengubah rule");
  }

  return data;
}

export async function deleteAdminRule(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menonaktifkan rule");
  }

  return data;
}

export async function addAdminRuleDetail(
  ruleId: string,
  payload: {
    symptomId: string;
    isMandatory: boolean;
  }
) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules/${ruleId}/details`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menambah detail rule");
  }

  return data;
}

export async function deleteAdminRuleDetail(ruleId: string, detailId: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/rules/${ruleId}/details/${detailId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal menghapus detail rule");
  }

  return data;
}

// API Consultation History Admin
export async function fetchAdminConsultations() {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/consultations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat riwayat konsultasi");
  }

  return data;
}

export async function fetchAdminConsultationById(id: string) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/consultations/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat detail konsultasi");
  }

  return data;
}


// API Dashboard Admin
export async function fetchAdminDashboardStats() {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Gagal memuat statistik dashboard");
  }

  return data;
}