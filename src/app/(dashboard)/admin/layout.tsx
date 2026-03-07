import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await getSession();
  } catch {
    redirect("/dashboard?message=Session+unavailable.+Please+try+again.");
  }
  const role = (session?.role ?? "").toString().trim().toUpperCase();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Admin" }]} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Console</h1>
          <p className="page-subtitle mt-1">
            Global management and system configuration.
          </p>
        </div>
      </div>

      <AdminNav />

      {children}
    </div>
  );
}
