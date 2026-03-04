"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  error?: string;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
  error,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!open) setIsConfirming(false);
  }, [open]);

  async function handleConfirm() {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  }

  const busy = loading || isConfirming;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.DialogPortal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-900/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 whitespace-pre-line text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </Dialog.Description>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                isDanger
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-teal-600 hover:bg-teal-500"
              }`}
            >
              {busy ? "…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.DialogPortal>
    </Dialog.Root>
  );
}
