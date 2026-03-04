import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { CreateRequestForm } from "./create-request-form";
import { listWarehouses } from "@/lib/repositories/warehouse-repository";
import { teamsByIds, listAllTeams } from "@/lib/repositories/team-repository";
import { getDb } from "@/lib/db/client";

export default async function CreateRequestPage() {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "OPS_USER") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-800">Access restricted</h2>
          <p className="mt-1 text-sm text-amber-700">
            Only shoot team members and admins can create requests. OPS users can view and act on existing tasks.
          </p>
        </div>
      </div>
    );
  }

  const db = getDb();
  const isAdmin = session.role === "ADMIN";
  const [warehouses, teams] = await Promise.all([
    listWarehouses(db),
    isAdmin ? listAllTeams(db) : teamsByIds(db, session.teamIds),
  ]);
  type TeamRow = { id: string; name: string; type: string };
  const shootTeams = (teams as TeamRow[]).filter((t) => t.type === "SHOOT");

  const userShootTeam = shootTeams.length > 0
    ? { id: shootTeams[0].id, name: shootTeams[0].name }
    : null;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/tasks" className="transition-colors hover:text-indigo-600">Tasks</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
        <span className="font-medium text-slate-900">Create request</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create request</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Paste or upload CSV (Clothing, Size, Bin Location, SKU Code) or JSON. Serial number is read from Bin Location (e.g. SN: 0000043569). SKU ↔ Serial mapping is shown everywhere.
        </p>
      </div>

      <CreateRequestForm
        warehouses={warehouses}
        userShootTeam={userShootTeam}
        allShootTeams={isAdmin ? shootTeams : undefined}
      />
    </div>
  );
}
