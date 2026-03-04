import { cn } from "@/lib/utils";
import {
  getTaskStatusClass,
  getTaskSerialStatusClass,
  getDisputeStatusClass,
  getStatusClass,
} from "@/lib/status-colors";

type BadgeVariant = "task" | "serial" | "dispute" | "auto";

export function Badge({
  children,
  status,
  variant = "auto",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  status?: string;
  variant?: BadgeVariant;
}) {
  const statusClass =
    status && variant === "task"
      ? getTaskStatusClass(status)
      : status && variant === "serial"
        ? getTaskSerialStatusClass(status)
        : status && variant === "dispute"
          ? getDisputeStatusClass(status)
          : status
            ? getStatusClass(status)
            : "";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusClass,
        className
      )}
      {...props}
    >
      {children ?? status}
    </span>
  );
}
