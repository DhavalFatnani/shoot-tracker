import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import * as teamRepo from "@/lib/repositories/team-repository";
import * as warehouseRepo from "@/lib/repositories/warehouse-repository";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProfileAccountForm } from "./profile-account-form";

export default async function ProfilePage() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    redirect("/dashboard?message=Profile+unavailable.+Try+again.");
  }
  if (!session) redirect("/dashboard");

  let teamList: { id: string; name: string; type: string }[] = [];
  let warehouseList: { id: string; name: string; code: string }[] = [];
  try {
    const db = getDb();
    const [teams, warehouses] = await Promise.all([
      session.teamIds.length > 0 ? teamRepo.teamsByIds(db, session.teamIds) : Promise.resolve([]),
      session.opsWarehouseIds.length > 0
        ? Promise.all(session.opsWarehouseIds.map((id) => warehouseRepo.warehouseById(db, id)))
        : Promise.resolve([]),
    ]);
    teamList = teams as { id: string; name: string; type: string }[];
    warehouseList = warehouses.filter(Boolean) as { id: string; name: string; code: string }[];
  } catch {
    // DB or team/warehouse fetch failed; show account info only, no 500
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Profile" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Profile</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your account, name, change password, and role details.</p>
        </div>
        <Link
          href="/profile/change-password"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900"
        >
          Change password
        </Link>
      </div>

      <ProfileAccountForm
        email={session.email}
        role={session.role}
        initialFirstName={session.firstName}
        initialLastName={session.lastName}
      />

      {teamList.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-600">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Team membership</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Teams you belong to</p>
          </div>
          <ul className="divide-y divide-zinc-100 p-5 dark:divide-zinc-600">
            {teamList.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{t.name}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warehouseList.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-600">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Warehouse access</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Ops warehouses linked to your teams</p>
          </div>
          <ul className="divide-y divide-zinc-100 p-5 dark:divide-zinc-600">
            {warehouseList.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{w.name}</span>
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{w.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {teamList.length === 0 && session.role !== "ADMIN" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No team assigned</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            You are not in any team yet. Contact your admin to be assigned to a shoot or ops team. If your role or teams look wrong (e.g. you are an admin), refresh the page or ask an admin to set your role in Admin → Users.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200">
              Back to dashboard
            </Link>
            <a href="/profile" className="text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200">
              Refresh profile
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
