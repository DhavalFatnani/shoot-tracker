import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";
import { DashboardClientWrapper } from "./dashboard-client-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in?message=Session+expired.+Please+sign+in+again.");

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <DashboardClientWrapper>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -m-[1px] h-[1px] w-[1px] overflow-hidden p-0 opacity-0 focus:m-0 focus:h-auto focus:w-auto focus:rounded focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white focus:opacity-100 focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar session={session} signOut={signOut} />
        <main id="main-content" className="pt-14 lg:pl-64 lg:pt-0" tabIndex={-1}>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardClientWrapper>
  );
}
