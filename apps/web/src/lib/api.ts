const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

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