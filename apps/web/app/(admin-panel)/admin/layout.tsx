import { AdminSidebar } from "@/src/components/admin/AdminSidebar";
import  AdminAuthGuard  from "@/src/components/admin/AdminAuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto flex max-w-7xl">
          <AdminSidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}