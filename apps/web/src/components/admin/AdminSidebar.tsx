"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/symptoms", label: "Gejala" },
  { href: "/admin/diseases", label: "Penyakit" },
  { href: "/admin/rules", label: "Rule" },
  { href: "/admin/weights", label: "Bobot CF" },
  { href: "/admin/consultations", label: "Konsultasi" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white p-4">
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
    </aside>
  );
}