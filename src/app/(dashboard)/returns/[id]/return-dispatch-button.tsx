"use client";

import { useState, useTransition } from "react";
import { dispatchReturn } from "@/app/actions/return-actions";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = { returnId: string };

export function ReturnDispatchButton({ returnId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("returnId", returnId);
      const result = await dispatchReturn(formData);
      if (result.success) {
        setOpen(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error ?? "Failed to dispatch return");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H3a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 14.586V8a1 1 0 00-1-1z" />
        </svg>
        Dispatch return
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Dispatch return"
        description="Send this return to transit? All serials will be marked in transit (return) and moved to TRANSIT. This cannot be undone."
        confirmLabel={loading ? "Dispatching…" : "Dispatch return"}
        onConfirm={handleConfirm}
        loading={loading}
        error={error ?? undefined}
      />
    </>
  );
}
