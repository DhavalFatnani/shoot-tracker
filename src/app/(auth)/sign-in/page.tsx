import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";
import { SignInMessageToast } from "./sign-in-message-toast";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const error = params.error;
  const message = params.message;

  return (
    <div className="w-full max-w-md">
      <SignInMessageToast message={message} />
      <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-200/20 backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/90 sm:p-10">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-2xl font-semibold tracking-tight text-zinc-900 transition duration-200 hover:text-teal-600 dark:text-zinc-100 dark:hover:text-teal-400"
          >
            ShootTrack
          </Link>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your account to continue
          </p>
        </div>
        {message && (
          <div className="mb-4 rounded-lg bg-teal-50 px-3.5 py-2.5 text-sm text-teal-800 dark:bg-teal-900/30 dark:text-teal-200" role="status">
            {String(message).replace(/\+/g, " ")}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
            {error}
          </div>
        )}
        <SignInForm />
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Contact your admin if you don&apos;t have an account.
        </p>
      </div>
      <p className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition duration-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back to home
        </Link>
      </p>
    </div>
  );
}
