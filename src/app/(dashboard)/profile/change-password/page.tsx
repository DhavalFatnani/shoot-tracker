import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SetNewPasswordForm } from "./set-new-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/profile", label: "Profile" }, { label: "Change password" }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Change password</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set a new password for your account. You will stay signed in.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <SetNewPasswordForm />
      </div>
      <p className="text-sm text-slate-500">
        <Link href="/profile" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Back to Profile
        </Link>
      </p>
    </div>
  );
}
