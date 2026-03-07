/**
 * All date/time formatting uses IST (Indian Standard Time, Asia/Kolkata) only.
 * Use these helpers everywhere instead of toLocaleString() / toLocaleDateString().
 */

const IST_TIMEZONE = "Asia/Kolkata";

const IST_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: IST_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

const IST_DATE_ONLY_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: IST_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "2-digit",
};

/** Format date and time in IST (e.g. "03 Mar 2025, 14:30:00"). */
export function formatDateTimeIST(value: Date | string | number | null | undefined): string {
  if (value == null) return "—";
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", IST_OPTIONS);
}

/** Format date only in IST (e.g. "03 Mar 2025"). */
export function formatDateIST(value: Date | string | number | null | undefined): string {
  if (value == null) return "—";
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", IST_DATE_ONLY_OPTIONS);
}

/** Format short date in IST for labels (e.g. "03 Mar 2025"). Same as formatDateIST. */
export function formatDateShortIST(value: Date | string | number | null | undefined): string {
  return formatDateIST(value);
}

/** Current date/time in IST for display or naming (e.g. return name). */
export function nowIST(): Date {
  return new Date();
}

/** Format for relative-style or compact display; still IST. */
export function formatDateTimeCompactIST(value: Date | string | number | null | undefined): string {
  if (value == null) return "—";
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  });
}

/** Relative time for activity feed (e.g. "2 mins ago", "1 hour ago"). Uses server time. */
export function formatRelativeTime(value: Date | string | number | null | undefined): string {
  if (value == null) return "—";
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return formatDateTimeCompactIST(d);
}
