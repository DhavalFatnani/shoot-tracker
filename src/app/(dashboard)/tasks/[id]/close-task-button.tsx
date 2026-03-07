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
      try {
        const result = await closeTask(formData);
        if (result.success) {
          toast("Task closed", { variant: "success" });
          router.refresh();
        } else {
          toast(result.error ?? "Failed to close task", { variant: "error" });
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong.", { variant: "error" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={disabled || pending}
      className="btn btn-danger"
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
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
          Close Task
        </>
      )}
    </button>
  );
}
