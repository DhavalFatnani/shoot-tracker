import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="section-card rounded-2xl border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-200/20 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 sm:p-10">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display inline-block text-2xl font-bold tracking-tight text-slate-900 transition hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
            ShootTrack
          </Link>
          <p className="page-subtitle mt-2">Enter your email and we&apos;ll send you a link to reset your password.</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
