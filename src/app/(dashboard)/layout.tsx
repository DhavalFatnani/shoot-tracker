import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";
import { DashboardClientWrapper } from "./dashboard-client-wrapper";

const LAST_ROLE_COOKIE = "x-last-role";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/sign-in?message=Something+went+wrong.+Please+sign+in+again.");
  }
  if (!session) redirect("/sign-in?message=Session+expired.+Please+sign+in+again.");

  // Store role in cookie so when DB fails we can still show correct role (avoids admin showing as Shoot)
  try {
    const cookieStore = await cookies();
    cookieStore.set(LAST_ROLE_COOKIE, session.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  } catch {
    // Non-fatal
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    // No redirect here — client handles navigation to avoid aborted-request rejection overlay
  }

  return (
    <DashboardClientWrapper>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -m-[1px] h-[1px] w-[1px] overflow-hidden p-0 opacity-0 focus:m-0 focus:h-auto focus:w-auto focus:rounded focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white focus:opacity-100 focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar session={session} signOut={signOut} />
        <main id="main-content" className="pt-14 lg:pl-64 lg:pt-0" tabIndex={-1}>
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </DashboardClientWrapper>
  );
}
