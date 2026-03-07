"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth/get-session";
import { useTheme } from "@/components/theme-provider";
import { DisputesBell } from "@/components/disputes-bell";
import { LogoMark } from "@/components/logo";

type NavItem = { href: string; label: string; icon: string; highlight?: boolean };

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/returns", label: "Returns", icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
  { href: "/disputes", label: "Disputes", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" },
  { href: "/activity", label: "Activity", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/serials/timeline", label: "Timeline", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/buffer-aging", label: "Buffer", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { href: "/sessions/scan", label: "Scan Session", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h12a1 1 0 001-1v-4a1 1 0 00-1-1H5a1 1 0 00-1 1v4a1 1 0 001 1z", highlight: true },
];

function navItemsForRole(role: string): NavItem[] {
  const r = role?.toUpperCase?.() ?? role;
  // OPS: dashboard, tasks, returns (raised by shoot), disputes, timeline, buffer, scan
  // OPS: dashboard, tasks, returns, disputes, timeline, buffer, scan (no Activity — admin only)
  if (r === "OPS_USER") {
    return ALL_NAV_ITEMS.filter(
      (i) => ["/dashboard", "/tasks", "/returns", "/disputes", "/serials/timeline", "/buffer-aging", "/sessions/scan"].includes(i.href)
    );
  }
  if (r === "SHOOT_USER") {
    return ALL_NAV_ITEMS.filter(
      (i) => ["/dashboard", "/tasks", "/returns", "/disputes", "/serials/timeline", "/sessions/scan"].includes(i.href)
    );
  }
  // ADMIN gets all (including Activity)
  return ALL_NAV_ITEMS;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  OPS_USER: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  SHOOT_USER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
};

const ADMIN_ITEM: NavItem = { href: "/admin", label: "Admin Console", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" };

export function Sidebar({
  session,
  signOut,
}: {
  session: SessionUser;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const { theme, setTheme } = useTheme();

  async function handleSignOut(e: React.FormEvent) {
    e.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    signOut()
      .catch(() => {})
      .finally(() => {
        router.replace("/");
      });
  }
  const navItems = navItemsForRole(session.role);
  const mainItems = navItems.filter((i) => i.href !== "/sessions/scan");
  const scanItem = navItems.find((i) => i.href === "/sessions/scan");
  const showAdmin = session.role === "ADMIN";

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const linkClass = (item: NavItem) =>
    `flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-sm font-semibold transition-all duration-200 border-l-[3px] ${
      isActive(item.href)
        ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-500"
        : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-indigo-400"
    } ${item.highlight ? "ring-1 ring-amber-200 dark:ring-amber-900/50 bg-amber-50 dark:bg-amber-950/20" : ""}`;

  const displayName =
    session.firstName && session.lastName
      ? `${session.firstName} ${session.lastName}`
      : session.email ?? "Signed in";
  const initial = displayName.charAt(0).toUpperCase();

  const navContent = (
    <>
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
        <LogoMark size="md" />
        <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">ShootTrack</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <span className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Operations</span>
        {mainItems.filter((i) => !["/activity", "/serials/timeline", "/buffer-aging"].includes(i.href)).map((item) => (
          <div key={item.href} className="flex items-center justify-between gap-2">
            <Link href={item.href} className={`min-w-0 flex-1 ${linkClass(item)}`} onClick={() => setMobileOpen(false)}>
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </Link>
            {item.href === "/disputes" && <DisputesBell />}
          </div>
        ))}
        <span className="mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Logs &amp; Analytics</span>
        {mainItems.some((i) => ["/activity", "/serials/timeline", "/buffer-aging"].includes(i.href)) && mainItems.filter((i) => ["/activity", "/serials/timeline", "/buffer-aging"].includes(i.href)).map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item)} onClick={() => setMobileOpen(false)}>
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
        <span className="mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tools</span>
        {scanItem && (
          <>
            <Link href={scanItem.href} className={linkClass(scanItem)} onClick={() => setMobileOpen(false)}>
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={scanItem.icon} />
              </svg>
              {scanItem.label}
            </Link>
          </>
        )}
        {showAdmin && (
          <Link href="/admin" className={linkClass(ADMIN_ITEM)} onClick={() => setMobileOpen(false)}>
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={ADMIN_ITEM.icon} />
              </svg>
              {ADMIN_ITEM.label}
            </Link>
        )}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        {/* Theme toggle: pill with sun / moon icons only */}
        <div className="mb-4 flex rounded-full bg-slate-100 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex-1 flex items-center justify-center rounded-full py-2.5 text-sm font-medium transition ${theme === "light" ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
            aria-label="Light mode"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex-1 flex items-center justify-center rounded-full py-2.5 text-sm font-medium transition ${theme === "dark" ? "bg-slate-700 text-white shadow-sm dark:bg-slate-600" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
            aria-label="Dark mode"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>

        {/* Profile row: avatar | name + badge + Change Password | logout icon */}
        <div className="flex items-start gap-3">
          <Link
            href="/profile"
            className="shrink-0 rounded-xl transition opacity-90 hover:opacity-100"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {initial}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href="/profile"
              className="block rounded-lg -m-1 p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(false)}
            >
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{displayName}</p>
            </Link>
            <span className={`mt-0.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[session.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
              {session.role.replace("_", " ")}
            </span>
            <Link
              href="/profile/change-password"
              onClick={() => setMobileOpen(false)}
              className="mt-0.5 block text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Change Password
            </Link>
          </div>
          <form onSubmit={handleSignOut} className="shrink-0">
            <button
              type="submit"
              disabled={signingOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Sign out"
            >
              {signingOut ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" aria-hidden />
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: hamburger */}
      <div className="fixed left-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark size="sm" className="shadow-none ring-0" />
          <span className="font-display font-bold tracking-tight text-slate-900 dark:text-white">
            ShootTrack
          </span>
        </Link>
      </div>

      {/* Mobile overlay + drawer with focus trap ref */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={drawerRef}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:hidden"
          >
            {navContent}
          </aside>
        </>
      )}

      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        {navContent}
      </aside>

      {/* Quick scan FAB (mobile only) */}
      {scanItem && (
        <Link
          href="/sessions/scan"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-900/30 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 lg:hidden"
          aria-label="Quick scan"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h12a1 1 0 001-1v-4a1 1 0 00-1-1H5a1 1 0 00-1 1v4a1 1 0 001 1z" />
          </svg>
        </Link>
      )}
    </>
  );
}
