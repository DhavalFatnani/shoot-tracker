"use client";

export function DashboardGreeting({ displayName }: { displayName: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
        ? "Good afternoon"
        : "Good evening";
  return (
    <span>
      {greeting}, {displayName}
    </span>
  );
}
