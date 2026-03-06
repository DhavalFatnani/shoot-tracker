"use client";

import Link from "next/link";

/**
 * Use inside ClickableTableRow so clicking the link does not also trigger row navigation.
 * Must be a Client Component because event handlers cannot be passed from Server Components.
 */
export function LinkWithStopPropagation({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </Link>
  );
}
