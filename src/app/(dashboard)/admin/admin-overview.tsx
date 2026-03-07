import Link from "next/link";
import { adminListUsers } from "@/app/actions/auth-actions";
import { adminListTeams, adminListWarehouses } from "@/app/actions/team-actions";

const SYSTEM_LOGS_PLACEHOLDER = [
  {
    icon: "team",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconColor: "text-sky-600 dark:text-sky-300",
    title: "New team created",
    description: "A new team was added to the organization.",
    time: "Recent",
  },
  {
    icon: "role",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-300",
    title: "Role updated",
    description: "User role or permissions were changed.",
    time: "This week",
  },
  {
    icon: "config",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-600 dark:text-rose-300",
    title: "Configuration changed",
    description: "System or warehouse settings were updated.",
    time: "This month",
  },
] as const;

const QUICK_ACTIONS = [
  {
    href: "/admin/users",
    label: "Add new user",
    icon: "user-plus",
    rightIcon: "plus",
  },
  {
    href: "/admin/warehouses",
    label: "Configure warehouse",
    icon: "warehouse",
    rightIcon: "gear",
  },
  {
    href: "/admin/teams",
    label: "Manage teams",
    icon: "users",
    rightIcon: "arrow",
  },
] as const;

export async function AdminOverview() {
  const [usersRes, teamsRes, warehousesRes] = await Promise.all([
    adminListUsers(),
    adminListTeams(),
    adminListWarehouses(),
  ]);

  const totalUsers = usersRes.users?.length ?? 0;
  const totalTeams = teamsRes.teams?.length ?? 0;
  const totalWarehouses = warehousesRes.warehouses?.length ?? 0;

  return (
    <section className="page-container space-y-6" aria-labelledby="admin-overview-heading">
      <h2 id="admin-overview-heading" className="sr-only">
        Overview
      </h2>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total users
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalUsers.toLocaleString()}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Registered accounts</p>
        </div>
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active teams
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalTeams.toLocaleString()}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Shoot & ops teams</p>
        </div>
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Warehouses
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalWarehouses.toLocaleString()}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Configured locations</p>
        </div>
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            System status
          </p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            Healthy
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">All systems operational</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* System logs */}
        <div className="section-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">System logs</h3>
            <Link
              href="/activity"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View activity
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {SYSTEM_LOGS_PLACEHOLDER.map((entry, i) => (
              <li key={i} className="flex gap-4 px-5 py-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${entry.iconBg} ${entry.iconColor}`}
                  aria-hidden
                >
                  {entry.icon === "team" && (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  {entry.icon === "role" && (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {entry.icon === "config" && (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{entry.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{entry.description}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{entry.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: Quick actions */}
        <div>
          <div className="section-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick actions</h3>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {QUICK_ACTIONS.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="flex items-center gap-3 font-medium text-slate-900 dark:text-slate-100">
                      {action.icon === "user-plus" && (
                        <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      )}
                      {action.icon === "warehouse" && (
                        <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {action.icon === "users" && (
                        <svg className="h-5 w-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                      {action.label}
                    </span>
                    <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
