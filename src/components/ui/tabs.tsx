"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string };

export function Tabs({
  items,
  currentHref,
  className,
}: {
  items: TabItem[];
  currentHref?: string;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Tabs"
      className={cn("segment-control", className)}
    >
      {items.map((item) => {
        const isActive = currentHref !== undefined ? currentHref === item.href : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={cn("segment-item", isActive && "segment-item-active")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
