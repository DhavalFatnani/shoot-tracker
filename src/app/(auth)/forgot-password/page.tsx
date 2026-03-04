import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-200/20 backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/90 sm:p-10">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-2xl font-semibold tracking-tight text-zinc-900 transition duration-200 hover:text-teal-600 dark:text-zinc-100 dark:hover:text-teal-400"
          >
            ShootTrack
          </Link>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
