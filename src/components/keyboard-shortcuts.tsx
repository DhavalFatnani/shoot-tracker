"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/toaster";

/**
 * Global keyboard shortcuts: ? = show shortcuts, G then D = Dashboard, G then T = Tasks, / = focus search on tasks page.
 */
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const gPressedAt = useRef<number | null>(null);
  const G_SEQ_TIMEOUT_MS = 800;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "?") {
        e.preventDefault();
        toast("G then D = Dashboard · G then T = Tasks · / = Search on tasks page", {
          title: "Keyboard shortcuts",
          variant: "default",
        });
        gPressedAt.current = null;
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        if (pathname?.startsWith("/tasks") && pathname !== "/tasks/create" && !/^\/tasks\/[^/]+$/.test(pathname)) {
          const searchInput = document.querySelector<HTMLInputElement>('input[name="q"]');
          searchInput?.focus();
        }
        gPressedAt.current = null;
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressedAt.current = Date.now();
        return;
      }

      if (gPressedAt.current && Date.now() - gPressedAt.current < G_SEQ_TIMEOUT_MS) {
        if (e.key === "d") {
          e.preventDefault();
          router.push("/dashboard");
        } else if (e.key === "t") {
          e.preventDefault();
          router.push("/tasks");
        }
      }
      gPressedAt.current = null;
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname, toast]);

  return <>{children}</>;
}
