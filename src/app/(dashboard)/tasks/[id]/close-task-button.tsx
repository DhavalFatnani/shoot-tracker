"use client";

import { useTransition } from "react";
import { closeTask } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";

export function CloseTaskButton({ taskId, disabled }: { taskId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function handleClose() {
    const formData = new FormData();
    formData.set("taskId", taskId);
    startTransition(async () => {
      const result = await closeTask(formData);
      if (result.success) {
        toast("Task closed", { variant: "success" });
        router.refresh();
      } else {
        toast(result.error ?? "Failed to close task", { variant: "error" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={disabled || pending}
      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Closing…
        </>
      ) : (
        "Close task"
      )}
    </button>
  );
}
