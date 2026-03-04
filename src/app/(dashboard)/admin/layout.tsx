import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Admin" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage users, teams, and warehouses.
          </p>
        </div>
      </div>

      <AdminNav />

      {children}
    </div>
  );
}
