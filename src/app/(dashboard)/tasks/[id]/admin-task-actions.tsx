"use client";

import { useState, useTransition } from "react";
import { adminReopenTask, adminUpdateTask, adminDeleteTask } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const SHOOT_REASONS = [
  { value: "INHOUSE_SHOOT", label: "Inhouse Shoot" },
  { value: "AGENCY_SHOOT", label: "Agency Shoot" },
  { value: "INFLUENCER_FITS", label: "Influencer Fits" },
];

type AdminTaskActionsProps = {
  taskId: string;
  taskStatus: string;
  currentName: string | null;
  currentShootReason: string;
};

export function AdminTaskActions({ taskId, taskStatus, currentName, currentShootReason }: AdminTaskActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [shootReason, setShootReason] = useState(currentShootReason);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const { toast } = useToast();

  const handleReopen = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      const res = await adminReopenTask(fd);
      if (res.success) {
        toast("Task reopened", { variant: "success" });
        router.refresh();
      } else {
        setError(res.error ?? "Failed to reopen");
      }
    });
  };

  const handleUpdate = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      if (name.trim() && name.trim() !== (currentName ?? "")) fd.set("name", name.trim());
      if (shootReason !== currentShootReason) fd.set("shootReason", shootReason);

      if (!fd.has("name") && !fd.has("shootReason")) {
        setError("No changes to save");
        return;
      }

      const res = await adminUpdateTask(fd);
      if (res.success) {
        toast("Task updated", { variant: "success" });
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to update");
      }
    });
  };

  const handleDeleteClick = () => {
    setError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeletePending(true);
    const fd = new FormData();
    fd.set("taskId", taskId);
    const res = await adminDeleteTask(fd);
    setDeletePending(false);
    if (res.success) {
      toast("Task deleted", { variant: "success" });
      setDeleteDialogOpen(false);
      router.push("/tasks");
      router.refresh();
    } else {
      toast(res.error ?? "Failed to delete", { variant: "error" });
    }
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
        </svg>
        <h3 className="text-sm font-semibold text-purple-800">Admin Controls</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleDeleteClick}
          disabled={pending}
          className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition disabled:opacity-50"
        >
          Delete Task
        </button>
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete task"
          description="Delete this task and all related data? This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          loading={deletePending}
        />
        {taskStatus === "CLOSED" && (
          <button
            onClick={handleReopen}
            disabled={pending}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {pending ? "Reopening..." : "Reopen Task"}
          </button>
        )}

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition"
          >
            Edit Task
          </button>
        ) : (
          <div className="mt-2 w-full space-y-3 rounded-lg border border-purple-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Task name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Shoot reason</label>
              <select
                value={shootReason}
                onChange={(e) => setShootReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                {SHOOT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdate}
                disabled={pending}
                className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {pending ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(null); setName(currentName ?? ""); setShootReason(currentShootReason); }}
                disabled={pending}
                className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
