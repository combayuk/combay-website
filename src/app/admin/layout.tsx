import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <AdminSidebar />
        <div className="admin-main flex-1 overflow-auto">
          <div className="admin-page p-4 lg:p-6">{children}</div>
        </div>
      </div>
    </AdminGuard>
  );
}
