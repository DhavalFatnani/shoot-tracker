"use client";

import { useRouter } from "next/navigation";

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
      className={`cursor-pointer transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50 ${className ?? ""}`}
    >
      {children}
    </tr>
  );
}
