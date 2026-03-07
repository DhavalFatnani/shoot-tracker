import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type CreateServerClientOptions = {
  /** If false, auth cookies are set as session cookies (cleared when browser closes). Default true. */
  persistSession?: boolean;
};

export async function createClient(options?: CreateServerClientOptions) {
  const cookieStore = await cookies();
  const persistSession = options?.persistSession !== false;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: { path?: string; maxAge?: number; domain?: string; secure?: boolean; httpOnly?: boolean; sameSite?: "lax" | "strict" | "none" } }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = persistSession ? options : { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, opts as Parameters<typeof cookieStore.set>[2]);
            });
          } catch {
            // ignore in Server Components
          }
        },
      },
    }
  );
}
