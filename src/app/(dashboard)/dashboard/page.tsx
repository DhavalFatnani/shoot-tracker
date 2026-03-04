import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { getDashboardKpis, type DashboardKpis } from "@/app/actions/dashboard-actions";

type CardDef = { title: string; subtitle: string; href: string; icon: string; color: string; highlight?: boolean };

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
    });
  } else if (ops) {
    const parts = kpis ? [kpis.pendingAction && `${kpis.pendingAction} pending action`, kpis.pickingPending && `${kpis.pickingPending} pending`, kpis.packed && `${kpis.packed} in picking`].filter(Boolean) : [];
    cards.push({
      title: "Tasks",
      subtitle: parts.length ? parts.join(" · ") : "Pick, dispatch, track",
      href: "/tasks",
      icon: ICONS.tasks,
      color: "bg-blue-500",
    });
  } else {
    const parts = kpis && kpis.inTransit ? [`${kpis.inTransit} awaiting receipt`] : [];
    cards.push({
      title: "Tasks",
      subtitle: parts.length ? parts[0] : "Your team's tasks",
      href: "/tasks",
      icon: ICONS.tasks,
      color: "bg-blue-500",
    });
  }

  if (shoot) {
    cards.push({
      title: "Create request",
      subtitle: "New task from serials",
      href: "/tasks/create",
      icon: ICONS.create,
      color: "bg-teal-500",
    });
  }

  cards.push({
    title: "Disputes",
    subtitle: kpis && kpis.openDisputes ? `${kpis.openDisputes} open` : "Open & resolved",
    href: "/disputes",
    icon: ICONS.disputes,
    color: "bg-amber-500",
  });

  cards.push({
    title: "Serial timeline",
    subtitle: "Audit trail",
    href: "/serials/timeline",
    icon: ICONS.timeline,
    color: "bg-purple-500",
  });

  if (ops) {
    cards.push({
      title: "Buffer aging",
      subtitle: kpis && kpis.bufferCount ? `${kpis.bufferCount} in buffer` : "Buffer serials",
      href: "/buffer-aging",
      icon: ICONS.buffer,
      color: "bg-rose-500",
    });
  }

  if (shoot) {
    cards.push({
      title: "Create return",
      subtitle: "Return items to warehouse",
      href: "/returns/create",
      icon: ICONS.returns,
      color: "bg-teal-500",
    });
  }

  // Scan — primary action for OPS & Shoot
  cards.push({
    title: "Scan",
    subtitle: "Pick · Receipt · Return",
    href: "/sessions/scan",
    icon: ICONS.scan,
      color: "bg-teal-500",
    highlight: role !== "ADMIN",
  });

  if (role === "ADMIN") {
    cards.push({
      title: "Admin",
      subtitle: "Users, teams, warehouses",
      href: "/admin",
      icon: ICONS.admin,
      color: "bg-zinc-600",
    });
  }

  return cards;
}

export default async function DashboardPage() {
  let session = null;
  let kpis: DashboardKpis | null = null;
  try {
    session = await getSession();
    const kpisResult = await getDashboardKpis();
    kpis = kpisResult.success ? kpisResult.data : null;
  } catch {
    // Layout already validated session; if page-level fetch fails, render with fallbacks
  }
  const role = session?.role ?? "SHOOT_USER";
  const cards = buildCards(role, kpis);
  const greeting = session?.email ? session.email.split("@")[0] : "there";
  const roleLabel = role === "OPS_USER" ? "Ops" : role === "SHOOT_USER" ? "Shoot" : "Admin";

  return (
    <div className="min-h-[60vh]">
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Hi, {greeting}
        </h1>
        <span className="text-sm font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {roleLabel}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative flex flex-col rounded-xl border bg-white p-5 shadow-sm transition duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${
              card.highlight
                ? "border-teal-200 bg-gradient-to-br from-teal-50/80 to-white dark:border-teal-800 dark:from-teal-900/20 dark:to-zinc-800"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:border-zinc-600"
            }`}
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.color} text-white shadow-sm`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
              </svg>
            </div>
            <h2 className="font-semibold text-zinc-900 transition group-hover:text-teal-600 dark:text-zinc-100 dark:group-hover:text-teal-400">
              {card.title}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {card.subtitle}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
