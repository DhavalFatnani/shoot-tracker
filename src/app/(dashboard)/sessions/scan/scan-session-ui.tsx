"use client";

import { useState, useTransition, useRef } from "react";
import { startSession, addScan, commitSession, cancelSession } from "@/app/actions/session-actions";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";

type SessionItem = { sessionId: string; serialId: string; scanStatus: string; errorReason: string | null };

type SessionType = "PICK" | "RECEIPT" | "RETURN_SCAN" | "RETURN_VERIFY";

const SESSION_TYPES_BY_ROLE: Record<string, { value: SessionType; label: string }[]> = {
  SHOOT_USER: [
    { value: "RECEIPT", label: "Receipt" },
    { value: "RETURN_SCAN", label: "Return scan" },
  ],
  OPS_USER: [
    { value: "PICK", label: "Pick" },
    { value: "RETURN_VERIFY", label: "Return verify" },
  ],
  ADMIN: [
    { value: "PICK", label: "Pick" },
    { value: "RECEIPT", label: "Receipt" },
    { value: "RETURN_SCAN", label: "Return scan" },
    { value: "RETURN_VERIFY", label: "Return verify" },
  ],
};

export function ScanSessionUI({ taskId, userRole, defaultSessionType }: { taskId: string; userRole: string; defaultSessionType?: string }) {
  const allowedTypes = SESSION_TYPES_BY_ROLE[userRole] ?? SESSION_TYPES_BY_ROLE.ADMIN;
  const initialType: SessionType =
    defaultSessionType && allowedTypes.some((t) => t.value === defaultSessionType) ? (defaultSessionType as SessionType) : allowedTypes[0].value;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>(initialType);
  const [scanInput, setScanInput] = useState("");
  const [items, setItems] = useState<SessionItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const lastKeyTimeRef = useRef(0);
  const SCANNER_MS = 80;

  function handleStartSession() {
    setMessage(null);
    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("type", sessionType);
    startTransition(async () => {
      const result = await startSession(formData);
      if (result.success && result.data) {
        setSessionId(result.data.sessionId);
        setItems([]);
      } else {
        setMessage(result.error ?? "Failed to start session");
      }
    });
  }

  function handleAddScan() {
    if (!sessionId || !scanInput.trim()) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("serialId", scanInput.trim());
    startTransition(async () => {
      const result = await addScan(formData);
      if (result.success && result.data) {
        const isDuplicate = result.data.ok === false && result.data.error === "DUPLICATE";
        if (isDuplicate) {
          setMessage(result.data?.message ?? "Serial already scanned in this session");
          setScanInput("");
        } else {
          setItems((prev) => [...prev, { sessionId, serialId: scanInput.trim(), scanStatus: result.data!.scanStatus ?? "OK", errorReason: result.data?.errorReason ?? null }]);
          setScanInput("");
          setMessage(result.data?.ok === false ? (result.data?.message ?? "Error") : null);
        }
      } else {
        setMessage(result.error ?? "Failed to add scan");
      }
    });
  }

  function handleCommit() {
    if (!sessionId) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    startTransition(async () => {
      const result = await commitSession(formData);
      if (result.success) {
        toast("Session committed successfully.", { variant: "success" });
        setSessionId(null);
        setItems([]);
        router.refresh();
      } else {
        setMessage(result.error ?? "Failed to commit");
      }
    });
  }

  async function handleConfirmCancel() {
    if (!sessionId) return;
    setCancelPending(true);
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    const result = await cancelSession(formData);
    setCancelPending(false);
    setCancelDialogOpen(false);
    if (result.success) {
      toast("Session cancelled.", { variant: "success" });
      setSessionId(null);
      setItems([]);
      router.refresh();
    } else {
      toast(result.error ?? "Failed to cancel session", { variant: "error" });
    }
  }

  const okCount = items.filter((i) => i.scanStatus !== "ERROR").length;
  const errCount = items.filter((i) => i.scanStatus === "ERROR").length;

  function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddScan();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setScanInput((prev) => prev.slice(0, -1));
      lastKeyTimeRef.current = Date.now();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      const now = Date.now();
      const isFast = now - lastKeyTimeRef.current <= SCANNER_MS;
      lastKeyTimeRef.current = now;
      setScanInput((prev) => (isFast ? prev + e.key : e.key));
    }
  }

  return (
    <div className="space-y-6">
      {!sessionId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Start a new session</h2>
          <div className="flex items-end gap-4">
            <div>
              <label htmlFor="session-type" className="mb-1.5 block text-sm font-medium text-slate-700">Session type</label>
              <select
                id="session-type"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {allowedTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleStartSession}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {pending ? "Starting..." : "Start session"}
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-amber-600">{message}</p>}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{sessionType}</span>
              <span className="text-slate-500">Session active</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={scanInput}
                onChange={() => {}}
                onKeyDown={onScanKeyDown}
                onPaste={(e) => {
                  e.preventDefault();
                  toast("Use scanner only; typing and paste are not allowed.", { variant: "error" });
                }}
                onCopy={(e) => e.preventDefault()}
                placeholder="Scan serial (scanner only)"
                autoComplete="off"
                autoFocus
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleAddScan}
                disabled={pending || !scanInput.trim()}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Add
              </button>
            </div>
            {message && <p className="mt-3 text-sm text-amber-600">{message}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Scanned items ({items.length})
              </h3>
              <div className="flex items-center gap-3 text-xs">
                {okCount > 0 && <span className="text-emerald-600">{okCount} OK</span>}
                {errCount > 0 && <span className="text-red-600">{errCount} errors</span>}
              </div>
            </div>
            {items.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No items scanned yet. Use the barcode scanner above.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`inline-flex h-2 w-2 rounded-full ${item.scanStatus === "ERROR" ? "bg-red-500" : "bg-emerald-500"}`} />
                    <span className="font-mono text-xs text-slate-700">{item.serialId}</span>
                    {item.scanStatus === "ERROR" && item.errorReason && (
                      <span className="text-xs text-red-600">{item.errorReason}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCommit}
              disabled={pending || items.length === 0}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {pending ? "Committing..." : "Commit session"}
            </button>
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel session
            </button>
          </div>

          <ConfirmDialog
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            title="Cancel session"
            description="Discard this scan session without committing? Scanned items will not be saved."
            confirmLabel="Cancel session"
            cancelLabel="Keep session"
            variant="danger"
            onConfirm={handleConfirmCancel}
            loading={cancelPending}
          />
        </>
      )}
    </div>
  );
}
