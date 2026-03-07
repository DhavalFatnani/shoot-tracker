import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            <LogoMark size="sm" className="shadow-none ring-0" />
            ShootTrack
          </Link>
          <nav className="hidden items-center gap-8 sm:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Features
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Analytics
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-16 pb-12 sm:pt-20 sm:pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Warehouse Management Reimagined
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl lg:text-6xl">
              Inventory tracking at the speed of light.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              The all-in-one platform for high-velocity serialized inventory, logistics disputes, and warehouse buffer optimization.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Go to Dashboard
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Watch Product Tour
              </a>
            </div>
            {/* Dashboard preview placeholder */}
            <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  ShootTrack Dashboard Preview
                </span>
              </div>
              <div className="flex min-h-[320px] items-center justify-center p-8">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {["Tasks", "Returns", "Disputes", "Buffer"].map((label) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-600" />
                      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Built for operations + features */}
        <section id="features" className="border-t border-slate-200 bg-slate-50/50 px-6 py-16 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                Built for operations that never stop.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                Everything you need to manage complex warehouse workflows in a single, unified interface.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Task Precision
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Automate pick-and-pack workflows with real-time verification and error prevention.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Dispute Guard
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Resolve inbound and outbound discrepancies with photographic evidence and audit logs.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Rapid Scan
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Lightning-fast mobile barcode scanning optimized for rugged warehouse environments.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Real-time Stats
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Live insights into warehouse buffer aging and operator productivity metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-12 dark:border-slate-800">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              <LogoMark size="sm" className="shadow-none ring-0" />
              ShootTrack
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <a href="#" className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                Terms of Service
              </a>
              <a href="#" className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                Privacy Policy
              </a>
              <a href="#" className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                Contact Support
              </a>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-6xl text-center text-sm text-slate-500 dark:text-slate-400">
            © 2024 ShootTrack Inc. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
