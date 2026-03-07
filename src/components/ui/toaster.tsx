"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

type ToastItem = {
  id: string;
  title?: string;
  description: string;
  variant: "success" | "error" | "default";
};

type ToastContextValue = {
  toast: (description: string, options?: { title?: string; variant?: "success" | "error" | "default" }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within Toaster");
  return ctx;
}

const variantStyles: Record<string, string> = {
  success: "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-100",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100",
  default: "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
};

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback(
    (description: string, options?: { title?: string; variant?: "success" | "error" | "default" }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: options?.title,
          description,
          variant: options?.variant ?? "default",
        },
      ]);
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider duration={5000} label="Notifications">
        {children}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[380px]" />
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) removeToast(t.id);
            }}
            className={`rounded-xl border px-4 py-3 shadow-lg ${variantStyles[t.variant]}`}
          >
            {t.title && (
              <ToastPrimitive.Title className="text-sm font-semibold">
                {t.title}
              </ToastPrimitive.Title>
            )}
            <ToastPrimitive.Description className={t.title ? "mt-0.5 text-sm" : "text-sm"}>
              {t.description}
            </ToastPrimitive.Description>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
