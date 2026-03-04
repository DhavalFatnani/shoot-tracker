import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "danger" | "ghost";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50 dark:focus:ring-offset-zinc-900",
          "active:scale-[0.98]",
          variant === "default" &&
            "bg-teal-600 text-white hover:bg-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500",
          variant === "outline" &&
            "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
          variant === "danger" &&
            "bg-red-600 text-white hover:bg-red-500 dark:hover:bg-red-500",
          variant === "ghost" && "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
