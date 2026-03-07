"use client";

import { Tabs } from "@/components/ui/tabs";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/warehouses", label: "Warehouses" },
] as const;

export function AdminNav() {
  return (
    <Tabs
      items={ADMIN_NAV.map(({ href, label }) => ({ href, label }))}
      className="w-fit"
    />
  );
}
