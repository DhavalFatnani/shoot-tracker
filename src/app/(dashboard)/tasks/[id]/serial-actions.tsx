"use client";

import { useState, useTransition } from "react";
import { markSerialSold, markSerialNotFound, markSerialQcFail, bulkDispatch, adminRevertSerial } from "@/app/actions/task-actions";
import { raiseDispute } from "@/app/actions/dispute-actions";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type SerialAction = "none" | "sold" | "qc-fail" | "dispute";

type TaskSerial = {
  taskId: string;
  serialId: string;
  status: string;
  sku?: string;
  returnable?: string;
  nonReturnReason?: string | null;
  orderId?: string | null;
  qcFailReason?: string | null;
};

type SerialActionsProps = {
  taskId: string;
  taskSerials: TaskSerial[];
  userRole: string;
  taskStatus?: string;
};

export function SerialActions({ taskId, taskSerials, userRole, taskStatus }: SerialActionsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const packedSerials = taskSerials.filter(s => s.status === "PACKED" || s.status === "PICKED");
  const isOpsOrAdmin = userRole === "OPS_USER" || userRole === "ADMIN";
  const canAct = taskStatus !== "CLOSED";
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);

  const handleBulkDispatchConfirm = async () => {
    setError(null);
    setDispatchLoading(true);
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      const result = await bulkDispatch(formData);
      if (result.success) {
        setDispatchDialogOpen(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error ?? "Failed to dispatch serials");
      }
    } finally {
      setDispatchLoading(false);
    }
  };

  const counts = {
    pendingAction: taskSerials.filter(s => s.status === "REQUESTED").length,
    packed: taskSerials.filter(s => s.status === "PACKED" || s.status === "PICKED").length,
    sold: taskSerials.filter(s => s.status === "SOLD").length,
    notFound: taskSerials.filter(s => s.status === "NOT_FOUND").length,
    qcFail: taskSerials.filter(s => s.status === "QC_FAIL").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
            {counts.pendingAction} pending action
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {counts.packed} packed
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700">
            {counts.sold} sold
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700">
            {counts.notFound} not found
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-medium text-rose-700">
            {counts.qcFail} QC fail
          </span>
        </div>

        {isOpsOrAdmin && packedSerials.length > 0 && canAct && (
          <>
            <button
              onClick={() => setDispatchDialogOpen(true)}
              disabled={dispatchLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              Dispatch All ({packedSerials.length})
            </button>
            <ConfirmDialog
              open={dispatchDialogOpen}
              onOpenChange={setDispatchDialogOpen}
              title="Dispatch all?"
              description={`Dispatch ${packedSerials.length} packed serial${packedSerials.length === 1 ? "" : "s"} to shoot? They will be marked as in transit.`}
              confirmLabel="Dispatch"
              onConfirm={handleBulkDispatchConfirm}
              loading={dispatchLoading}
            />
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

export type SerialRowActionsSerial = { serialId: string; status: string; taskId?: string };

export function SerialRowActions({
  serial,
  taskId,
  userRole,
  taskStatus,
}: {
  serial: SerialRowActionsSerial;
  taskId: string;
  userRole: string;
  taskStatus?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<SerialAction>("none");
  const [orderId, setOrderId] = useState("");
  const [qcReason, setQcReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [disputeType, setDisputeType] = useState("DAMAGED");
  const [disputeDescription, setDisputeDescription] = useState("");

  if (!serial?.serialId || serial.status == null) return null;
  if (taskStatus === "CLOSED") return null;

  const isAdmin = userRole === "ADMIN";
  const isOpsOrAdmin = userRole === "OPS_USER" || isAdmin;
  const actionableStatus = serial.status === "REQUESTED" || serial.status === "PACKED" || serial.status === "PICKED";
  const disputeOnlyStatus = serial.status === "IN_TRANSIT" || serial.status === "RECEIVED";
  const revertableStatus = !actionableStatus && serial.status !== "REQUESTED";

  if (!isOpsOrAdmin) return null;
  if (!actionableStatus && !disputeOnlyStatus && !(isAdmin && revertableStatus)) return null;

  const handleRevert = () => {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("serialId", serial.serialId);
        const res = await adminRevertSerial(fd);
        if (res.success) { router.refresh(); }
        else { setError(res.error ?? "Failed to revert"); }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const handleRaiseDispute = () => {
    if (!disputeType.trim()) {
      setError("Dispute type is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("serialId", serial.serialId);
        fd.set("disputeType", disputeType);
        fd.set("description", disputeDescription);
        const res = await raiseDispute(fd);
        if (res.success) {
          setActiveAction("none");
          setDisputeDescription("");
          router.refresh();
        } else {
          setError(res.error ?? "Failed to create dispute");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  if (!actionableStatus && isAdmin && revertableStatus) {
    return (
      <div className="flex flex-col gap-1.5">
        <button onClick={handleRevert} disabled={pending}
          className="rounded-md bg-purple-100 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50">
          Revert to Requested
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (disputeOnlyStatus) {
    if (activeAction === "dispute") {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-1.5">
            <select
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="DAMAGED">Damaged / QC issue</option>
              <option value="WRONG_ITEM">Wrong item</option>
              <option value="MISSING_FROM_SHOOT">Missing from shoot</option>
              <option value="SCAN_MISMATCH">Scan mismatch</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea
              placeholder="Add details…"
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRaiseDispute} disabled={pending}
              className="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
              {pending ? "Creating..." : "Create dispute"}
            </button>
            <button onClick={() => { setActiveAction("none"); setError(null); }} disabled={pending}
              className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => setActiveAction("dispute")}
          disabled={pending}
          className="rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
        >
          Raise dispute
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const handleSold = () => {
    if (!orderId.trim()) { setError("Order ID is required"); return; }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("serialId", serial.serialId);
        fd.set("orderId", orderId);
        const res = await markSerialSold(fd);
        if (res.success) { setActiveAction("none"); router.refresh(); }
        else { setError(res.error ?? "Failed"); }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const handleNotFound = () => {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("serialId", serial.serialId);
        const res = await markSerialNotFound(fd);
        if (res.success) { router.refresh(); }
        else { setError(res.error ?? "Failed"); }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const handleQcFail = () => {
    if (!qcReason.trim()) { setError("QC fail reason is required"); return; }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("serialId", serial.serialId);
        fd.set("reason", qcReason);
        const res = await markSerialQcFail(fd);
        if (res.success) { setActiveAction("none"); router.refresh(); }
        else { setError(res.error ?? "Failed"); }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  if (activeAction === "sold") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-36 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <button onClick={handleSold} disabled={pending}
            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Confirm
          </button>
          <button onClick={() => { setActiveAction("none"); setError(null); }} disabled={pending}
            className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (activeAction === "qc-fail") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="QC fail reason"
            value={qcReason}
            onChange={(e) => setQcReason(e.target.value)}
            className="w-36 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <button onClick={handleQcFail} disabled={pending}
            className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50">
            Confirm
          </button>
          <button onClick={() => { setActiveAction("none"); setError(null); }} disabled={pending}
            className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (activeAction === "dispute") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-1.5">
          <select
            value={disputeType}
            onChange={(e) => setDisputeType(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="DAMAGED">Damaged / QC issue</option>
            <option value="WRONG_ITEM">Wrong item</option>
            <option value="MISSING_FROM_SHOOT">Missing from shoot</option>
            <option value="SCAN_MISMATCH">Scan mismatch</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea
            placeholder="Add details to help resolve this dispute…"
            value={disputeDescription}
            onChange={(e) => setDisputeDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRaiseDispute}
            disabled={pending}
            className="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create dispute"}
          </button>
          <button
            onClick={() => { setActiveAction("none"); setError(null); }}
            disabled={pending}
            className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button onClick={() => setActiveAction("sold")} disabled={pending}
          className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">
          Mark Sold
        </button>
        <button onClick={handleNotFound} disabled={pending}
          className="rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50">
          Not Found
        </button>
        <button onClick={() => setActiveAction("qc-fail")} disabled={pending}
          className="rounded-md bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-50">
          QC Fail
        </button>
        <button
          onClick={() => setActiveAction("dispute")}
          disabled={pending}
          className="rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
        >
          Raise dispute
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}