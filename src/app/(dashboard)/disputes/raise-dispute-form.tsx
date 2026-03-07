"use client";

import { useState, useTransition, useCallback } from "react";
import { listTaskSerials } from "@/app/actions/task-actions";
import { raiseDispute } from "@/app/actions/dispute-actions";
import { useRouter } from "next/navigation";
import { formatTaskSerial } from "@/lib/format-serials";

type TaskOption = { id: string; serial: number };
type SerialOption = { serialId: string; status: string; sku?: string };

export function RaiseDisputeForm({ tasks, onSuccess, inModal }: { tasks: TaskOption[]; onSuccess?: () => void; inModal?: boolean }) {
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
      try {
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
          onSuccess?.();
        } else {
          setError(res.error ?? "Failed to create dispute");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <div className={inModal ? "space-y-4" : "rounded-2xl border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-800/40"}>
      {!inModal && (
        <>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">Raise new dispute.</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Select a task and serial, then choose the dispute type and add details.
          </p>
        </>
      )}

      <div className={inModal ? "space-y-4" : "mt-5 space-y-4"}>
        <div>
          <label htmlFor="raise-dispute-task" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Task
          </label>
          <select
            id="raise-dispute-task"
            value={taskId}
            onChange={(e) => onTaskChange(e.target.value)}
            className="input-base w-full py-2.5 pr-9"
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
          <label htmlFor="raise-dispute-serial" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Serial
          </label>
          <select
            id="raise-dispute-serial"
            value={serialId}
            onChange={(e) => setSerialId(e.target.value)}
            disabled={!taskId || loadingSerials}
            className="input-base w-full py-2.5 pr-9 disabled:opacity-60"
          >
            <option value="">{loadingSerials ? "Loading…" : taskId ? "Select serial" : "Select task first"}</option>
            {serials.map((s) => (
              <option key={s.serialId} value={s.serialId}>
                {s.serialId}{s.sku ? ` - ${s.sku}` : ""} ({s.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="raise-dispute-type" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Type
          </label>
          <select
            id="raise-dispute-type"
            value={disputeType}
            onChange={(e) => setDisputeType(e.target.value)}
            className="input-base w-full py-2.5 pr-9"
          >
            <option value="DAMAGED">Damaged / QC issue</option>
            <option value="WRONG_ITEM">Wrong item</option>
            <option value="MISSING_FROM_SHOOT">Missing from shoot</option>
            <option value="SCAN_MISMATCH">Scan mismatch</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="raise-dispute-desc" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description (optional)
          </label>
          <textarea
            id="raise-dispute-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details…"
            rows={3}
            className="input-base w-full resize-y min-h-[80px]"
          />
        </div>
      </div>

      {error && (
        <p id="raise-dispute-error" className={inModal ? "text-sm text-red-600 dark:text-red-400" : "mt-4 text-sm text-red-600 dark:text-red-400"} role="alert">
          {error}
        </p>
      )}

      <div className={inModal ? "pt-1" : "mt-5"}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !taskId || !serialId}
          className="btn w-full sm:w-auto rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
        >
          {pending ? "Creating…" : "Create dispute"}
        </button>
      </div>
    </div>
  );
}
