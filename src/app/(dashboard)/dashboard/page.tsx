import { Suspense } from "react";
import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";

export const dynamic = "force-dynamic";
import {
  getDashboardKpis,
  getDashboardRecentActivity,
  type DashboardKpis,
  type DashboardActivityItem,
} from "@/app/actions/dashboard-actions";
import { formatRelativeTime } from "@/lib/format-date";
import { DashboardGreeting } from "./dashboard-greeting";
import { DisputesBell } from "@/components/disputes-bell";
import { Skeleton } from "@/components/ui/skeleton";

type CardDef = {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  color: string;
  highlight?: boolean;
  actionLabel?: string;
};

const ICONS: Record<string, string> = {
  tasks: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  create: "M12 4v16m8-8H4",
  disputes: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  timeline: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  buffer: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  returns: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  scan: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h12a1 1 0 001-1v-4a1 1 0 00-1-1H5a1 1 0 00-1 1v4a1 1 0 001 1z",
  admin: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
};

function buildCards(role: string, kpis: { pickingPending: number; packed: number; inTransit: number; pendingAction: number; openDisputes: number; bufferCount: number } | null): CardDef[] {
  const ops = role === "OPS_USER" || role === "ADMIN";
  const shoot = role === "SHOOT_USER" || role === "ADMIN";

  const cards: CardDef[] = [];

  // Tasks — one card with role-relevant counts in subtitle
  if (ops && shoot) {
    const parts = [];
    if (kpis) {
      if (kpis.pendingAction) parts.push(`${kpis.pendingAction} pending action`);
      if (kpis.pickingPending) parts.push(`${kpis.pickingPending} pending pick`);
      if (kpis.packed) parts.push(`${kpis.packed} in picking`);
      if (kpis.inTransit) parts.push(`${kpis.inTransit} in transit`);
    }
    cards.push({
      title: "Tasks",
      subtitle: parts.length ? parts.join(" · ") : "View and manage tasks",
      href: "/tasks",
      icon: ICONS.tasks,
      color: "bg-blue-500",
      actionLabel: "Manage tasks",
    });
  } else if (ops) {
    const parts = kpis ? [kpis.pendingAction && `${kpis.pendingAction} pending action`, kpis.pickingPending && `${kpis.pickingPending} pending`, kpis.packed && `${kpis.packed} in picking`].filter(Boolean) : [];
    cards.push({
      title: "Tasks",
      subtitle: parts.length ? parts.join(" · ") : "Pick, dispatch, track",
      href: "/tasks",
      icon: ICONS.tasks,
      color: "bg-blue-500",
      actionLabel: "Manage tasks",
    });
  } else {
    const parts = kpis && kpis.inTransit ? [`${kpis.inTransit} awaiting receipt`] : [];
    cards.push({
      title: "Tasks",
      subtitle: parts.length ? parts[0] : "Your team's tasks",
      href: "/tasks",
      icon: ICONS.tasks,
      color: "bg-blue-500",
      actionLabel: "Manage tasks",
    });
  }

  if (shoot) {
    cards.push({
      title: "Create request",
      subtitle: "Initialize new task sessions from serialized inventory.",
      href: "/tasks/create",
      icon: ICONS.create,
      color: "bg-indigo-500",
      actionLabel: "New session",
    });
  }

  cards.push({
    title: "Disputes",
    subtitle: kpis && kpis.openDisputes
      ? `${kpis.openDisputes} Open items require urgent attention and verification.`
      : "Open & resolved",
    href: "/disputes",
    icon: ICONS.disputes,
    color: "bg-amber-500",
    actionLabel: "Resolve issues",
  });

  cards.push({
    title: "Serial timeline",
    subtitle: "Full audit trail and lifecycle history for all serial numbers.",
    href: "/serials/timeline",
    icon: ICONS.timeline,
    color: "bg-purple-500",
  });

  if (ops) {
    cards.push({
      title: "Buffer aging",
      subtitle: kpis && kpis.bufferCount
        ? `${kpis.bufferCount} in buffer`
        : "Monitor inventory shelf-life and buffer zone efficiency.",
      href: "/buffer-aging",
      icon: ICONS.buffer,
      color: "bg-rose-500",
    });
  }

  if (shoot) {
    cards.push({
      title: "Create return",
      subtitle: "Process inbound returns from field shoots to warehouse.",
      href: "/returns/create",
      icon: ICONS.returns,
      color: "bg-indigo-500",
    });
  }

  // Scan — primary action for OPS & Shoot
  cards.push({
    title: "Quick Scan",
    subtitle: "Launch barcode scanner for pick, receipt, or return verification.",
    href: "/sessions/scan",
    icon: ICONS.scan,
    color: "bg-indigo-500",
    highlight: role !== "ADMIN",
    actionLabel: "Start scanning",
  });

  if (role === "ADMIN") {
    cards.push({
      title: "Admin",
      subtitle: "Manage users, teams, and warehouse configurations.",
      href: "/admin",
      icon: ICONS.admin,
      color: "bg-zinc-600",
    });
  }

  return cards;
}

function DashboardDataSkeleton() {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <section className="mt-10" aria-labelledby="recent-activity-heading">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="table-wrapper">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </section>
    </>
  );
}

async function DashboardData({
  role,
  isAdmin,
}: {
  role: string;
  showCreateRequest: boolean;
  isAdmin: boolean;
}) {
  let kpis: DashboardKpis | null = null;
  let recentActivity: DashboardActivityItem[] = [];
  try {
    const [kpisResult, activityResult] = await Promise.all([
      getDashboardKpis(),
      getDashboardRecentActivity(10),
    ]);
    kpis = kpisResult.success ? kpisResult.data : null;
    recentActivity = activityResult.success ? activityResult.data : [];
  } catch {
    // Render with fallbacks
  }
  const cards = buildCards(role, kpis);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative flex flex-col p-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${
              card.highlight
                ? "rounded-2xl border-0 bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl dark:from-indigo-500 dark:to-indigo-600"
                : "section-card section-card-hover rounded-2xl border border-slate-200 hover:-translate-y-0.5 hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-900/50"
            }`}
          >
            <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.highlight ? "bg-white/20 ring-1 ring-white/30" : card.color} text-white shadow-md transition-transform group-hover:scale-110`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
              </svg>
            </div>
            <h2 className={`text-xl font-display font-bold ${card.highlight ? "text-white" : "text-slate-900 dark:text-white"}`}>
              {card.title}
            </h2>
            <p className={`mt-2 text-sm leading-relaxed ${card.highlight ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
              {card.subtitle}
            </p>
            {card.actionLabel && (
              <div className={`mt-4 flex items-center gap-1 text-sm font-bold ${card.highlight ? "text-white" : "text-indigo-600 dark:text-indigo-400"}`}>
                {card.actionLabel}
                {card.highlight && card.actionLabel === "Start scanning" ? (
                  <span aria-hidden>→</span>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="recent-activity-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-activity-heading" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Recent Activity
          </h2>
          {isAdmin && (
            <Link
              href="/activity"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all activity
            </Link>
          )}
        </div>
        <div className="table-wrapper">
          <table className="table table-sticky table-row-hover">
            <thead>
              <tr>
                <th className="table-th">Type</th>
                <th className="table-th">Description</th>
                <th className="table-th">User</th>
                <th className="table-th">Date</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-td py-10 text-center text-slate-500 dark:text-slate-400">
                    No recent activity yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td className="table-td">
                      <span
                        className={`badge ${
                          item.type === "Dispatch"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                            : item.type === "Return"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="table-td">
                      {item.taskId ? (
                        <Link
                          href={`/tasks/${item.taskId}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                        >
                          {item.description}
                        </Link>
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="table-td">{item.userDisplayName}</td>
                    <td className="table-td text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                    </td>
                    <td className="table-td">
                      <span
                        className={`badge ${
                          item.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                            : item.status === "ACTIVE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                              : item.status === "OPEN"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default async function DashboardPage() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    // Layout already validated session
  }
  const role = session?.role ?? "SHOOT_USER";
  const displayName =
    session?.firstName && session?.lastName
      ? `${session.firstName} ${session.lastName}`
      : session?.email?.split("@")[0] || "there";
  const showCreateRequest = role === "SHOOT_USER" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  return (
    <div className="min-h-[60vh]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">
            <DashboardGreeting displayName={displayName} />
          </h1>
          <p className="page-subtitle mt-1">
            Here&apos;s what&apos;s happening across your warehouse today.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showCreateRequest && (
            <Link href="/tasks/create" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Request
            </Link>
          )}
          <DisputesBell alwaysShowLink />
        </div>
      </div>

      <Suspense fallback={<DashboardDataSkeleton />}>
        <DashboardData role={role} showCreateRequest={showCreateRequest} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
