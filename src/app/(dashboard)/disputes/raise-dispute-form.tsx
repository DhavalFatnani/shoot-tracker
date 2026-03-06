"use client";

import { useState, useTransition, useCallback } from "react";
import { listTaskSerials } from "@/app/actions/task-actions";
import { raiseDispute } from "@/app/actions/dispute-actions";
import { useRouter } from "next/navigation";
import { formatTaskSerial } from "@/lib/format-serials";

type TaskOption = { id: string; serial: number };
type SerialOption = { serialId: string; status: string; sku?: string };

export function RaiseDisputeForm({ tasks }: { tasks: TaskOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [taskId, setTaskId] = useState("");
  const [serials, setSerials] = useState<SerialOption[]>([]);
  const [serialId, setSerialId] = useState("");
  const [disputeType, setDisputeType] = useState("DAMAGED");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSerials, setLoadingSerials] = useState(false);

  const loadSerials = useCallback((tid: string) => {
    if (!tid) {
      setSerials([]);
      setSerialId("");
      return;
    }
    setLoadingSerials(true);
    setSerialId("");
    const fd = new FormData();
    fd.set("taskId", tid);
    listTaskSerials(fd).then((res) => {
      setLoadingSerials(false);
      if (res.success && res.data) {
        setSerials(res.data);
        setSerialId(res.data[0]?.serialId ?? "");
      } else {
        setSerials([]);
      }
    });
  }, []);

  const onTaskChange = (tid: string) => {
    setTaskId(tid);
    loadSerials(tid);
  };

  const handleSubmit = () => {
    if (!taskId || !serialId || !disputeType.trim()) {
      setError("Task, serial, and dispute type are required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("serialId", serialId);
      fd.set("disputeType", disputeType);
      fd.set("description", description.trim());
      const res = await raiseDispute(fd);
      if (res.success) {
        setTaskId("");
        setSerialId("");
        setSerials([]);
        setDescription("");
        router.refresh();
      } else {
        setError(res.error ?? "Failed to create dispute");
      }
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Raise new dispute</h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Select a task and serial, then choose the dispute type and add details.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Task</label>
          <select
            value={taskId}
            onChange={(e) => onTaskChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Select task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                Task {formatTaskSerial(t.serial)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Serial</label>
          <select
            value={serialId}
            onChange={(e) => setSerialId(e.target.value)}
            disabled={!taskId || loadingSerials}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">{loadingSerials ? "Loading…" : taskId ? "Select serial" : "Select task first"}</option>
            {serials.map((s) => (
              <option key={s.serialId} value={s.serialId}>
                {s.serialId} {s.sku ? ` · ${s.sku}` : ""} ({s.status})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Type</label>
          <select
            value={disputeType}
            onChange={(e) => setDisputeType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="DAMAGED">Damaged / QC issue</option>
            <option value="WRONG_ITEM">Wrong item</option>
            <option value="MISSING_FROM_SHOOT">Missing from shoot</option>
            <option value="SCAN_MISMATCH">Scan mismatch</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details…"
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !taskId || !serialId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-zinc-800"
        >
          {pending ? "Creating…" : "Create dispute"}
        </button>
      </div>
    </div>
  );
}
