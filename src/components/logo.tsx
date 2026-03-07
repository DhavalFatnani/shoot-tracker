/**
 * ShootTrack logo – modern mark (rounded box + track arrow).
 * Use with className for size/color; inherits text color by default.
 */
export function Logo({
  className = "h-8 w-8",
  ariaHidden = true,
}: {
  className?: string;
  ariaHidden?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="7"
        stroke="currentColor"
        strokeWidth="2.25"
        fill="none"
      />
      <path
        d="M9 21l6-6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Logo wrapped in the standard brand pill (for sidebar, headers).
 */
export function LogoMark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-12 w-12"
        : "h-10 w-10";
  const iconClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-500/20 dark:bg-indigo-500 dark:shadow-indigo-500/20 ${sizeClass} ${className}`}
      aria-hidden
    >
      <Logo className={iconClass} />
    </div>
  );
}
