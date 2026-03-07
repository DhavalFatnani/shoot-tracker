import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";
import { SignInContactAdmin } from "./sign-in-contact-admin";
import { LogoMark } from "@/components/logo";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) redirect("/dashboard");
  } catch {
    // If Supabase check fails (e.g. env or network), still show the form so the page never goes blank
  }

  let error: string | undefined;
  let message: string | undefined;
  try {
    const params = await searchParams;
    error = params.error;
    message = params.message;
  } catch {
    error = undefined;
    message = undefined;
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Header: logo + welcome */}
      <div className="mb-8 flex flex-col items-center text-center">
        <Link href="/" className="flex flex-col items-center gap-4">
          <LogoMark size="lg" className="rounded-full bg-[#5B21B6] shadow-lg shadow-violet-900/30 ring-0" />
          <span className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome back
          </span>
        </Link>
        <p className="mt-1 text-slate-400">
          Sign in to continue to ShootTrack
        </p>
      </div>

      {/* Form card */}
      <div
        className="w-full rounded-2xl p-8 shadow-xl sm:p-10"
        style={{ backgroundColor: "#252538" }}
      >
        {message && (
          <div className="mb-4 rounded-xl bg-indigo-500/20 px-4 py-3 text-sm font-medium text-indigo-200" role="status">
            {String(message).replace(/\+/g, " ")}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm font-medium text-red-200" role="alert">
            {error}
          </div>
        )}
        <SignInForm />
        <p className="mt-4 text-center text-xs text-slate-500">
          If your browser shows a &quot;password found in breach&quot; warning, it&apos;s from your browser (e.g. Google Password Manager) checking your password against public breach lists—not ShootTrack. Use a unique, strong password for this account.
        </p>
      </div>

      <SignInContactAdmin />
      <div className="mt-6 text-slate-500" aria-hidden>
        <svg className="mx-auto h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    </div>
  );
}
