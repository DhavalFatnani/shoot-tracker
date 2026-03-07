"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * A table row that navigates to href when clicked (anywhere on the row).
 * Use onClick={e => e.stopPropagation()} on links/buttons inside the row so they don't trigger row navigation.
 */
export function ClickableTableRow({ href, children, className }: Props) {
  const router = useRouter();
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className={cn("cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", className)}
    >
      {children}
    </tr>
  );
}
