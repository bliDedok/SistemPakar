"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const menus = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/symptoms", label: "Gejala" },
  { href: "/admin/diseases", label: "Penyakit" },
  { href: "/admin/weights", label: "Bobot CF" },
  { href: "/admin/rules", label: "Rule" },
  { href: "/admin/consultations", label: "Konsultasi" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("admin_token");
    router.replace("/admin/login");
  }

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r bg-white p-4">
      <div>
        <h2 className="mb-6 text-xl font-bold">Admin Panel</h2>

        <nav className="space-y-2">
          {menus.map((menu) => {
            const active = pathname === menu.href;

            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={`block rounded-lg px-3 py-2 ${
                  active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {menu.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}