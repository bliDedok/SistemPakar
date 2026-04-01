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