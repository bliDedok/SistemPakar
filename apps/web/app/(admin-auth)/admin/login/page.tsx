"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/src/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (token) {
      router.replace("/admin");
      return;
    }

    setChecking(false);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const response = await adminLogin({ username, password });
      localStorage.setItem("admin_token", response.data.token);
      router.replace("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          Memeriksa sesi admin...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">Login Admin</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-60"
          >
            {loading ? "Masuk..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}