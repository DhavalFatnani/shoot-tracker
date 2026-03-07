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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">
            {description}
          </Dialog.Description>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions mt-6 justify-end">
            <Dialog.Close asChild>
              <button type="button" disabled={busy} className="btn-secondary">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={isDanger ? "btn-danger" : "btn-primary"}
            >
              {busy ? "…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.DialogPortal>
    </Dialog.Root>
  );
}
