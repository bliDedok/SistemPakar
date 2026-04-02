"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [token] = useState<string | null>(() => getAdminToken());

  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border bg-white px-6 py-4 shadow-sm">
          Memeriksa akses admin...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}