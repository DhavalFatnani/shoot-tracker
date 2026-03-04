import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">ShootTrack</span>
        <Link
          href="/sign-in"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        >
          Sign in
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Inventory tracking made simple
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Track every serial,<br />
            <span className="text-teal-600 dark:text-teal-400">from warehouse to shoot</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
            End-to-end serialized shoot inventory management. Pick, dispatch, scan, return, and resolve disputes with full audit trails.
          </p>
          <div className="mt-10">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition duration-200 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            >
              Get started
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
