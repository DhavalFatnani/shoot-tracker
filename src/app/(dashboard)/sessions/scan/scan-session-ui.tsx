"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { startSession, addScan, commitSession, cancelSession } from "@/app/actions/session-actions";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CameraBarcodeScanner } from "@/components/camera-barcode-scanner";
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

export function ScanSessionUI({ taskId, userRole, defaultSessionType, nonReturnableSerialIds = [] }: { taskId: string; userRole: string; defaultSessionType?: string; nonReturnableSerialIds?: string[] }) {
  const allowedTypes = SESSION_TYPES_BY_ROLE[userRole] ?? SESSION_TYPES_BY_ROLE.ADMIN;
  const initialType: SessionType =
    defaultSessionType && allowedTypes.some((t) => t.value === defaultSessionType) ? (defaultSessionType as SessionType) : allowedTypes[0].value;
  const nonReturnableSet = useMemo(() => new Set(nonReturnableSerialIds), [nonReturnableSerialIds]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>(initialType);
  const [scanInput, setScanInput] = useState("");
  const [items, setItems] = useState<SessionItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const lastInputTimeRef = useRef(0);
  const prevLenRef = useRef(0);
  const scanningRef = useRef(false);
  /** Max ms between key events to treat as scanner (not human typing). Barcode scanners are typically <10ms. */
  const SCANNER_THRESHOLD_MS = 20;
  /** Serial numbers are exactly 10 digits. */
  const SERIAL_LENGTH = 10;
  const SERIAL_DIGITS_ONLY = /^\d{10}$/;

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

  function submitSerial(serial: string) {
    if (!sessionId || !SERIAL_DIGITS_ONLY.test(serial)) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("serialId", serial);
    startTransition(async () => {
      const result = await addScan(formData);
      if (result.success && result.data) {
        const isDuplicate = result.data.ok === false && result.data.error === "DUPLICATE";
        if (isDuplicate) {
          setMessage(result.data?.message ?? "Serial already scanned in this session");
          toast(result.data?.message ?? "Serial already scanned in this session", { variant: "error" });
          setScanInput("");
          prevLenRef.current = 0;
          scanningRef.current = false;
        } else {
          setItems((prev) => [...prev, { sessionId, serialId: serial, scanStatus: result.data!.scanStatus ?? "OK", errorReason: result.data?.errorReason ?? null }]);
          setScanInput("");
          prevLenRef.current = 0;
          scanningRef.current = false;
          setMessage(result.data?.ok === false ? (result.data?.message ?? "Error") : null);
        }
      } else {
        setMessage(result.error ?? "Failed to add scan");
      }
    });
  }

  function handleAddScan() {
    if (!sessionId || !scanInput.trim()) return;
    const serial = scanInput.trim();
    if (!SERIAL_DIGITS_ONLY.test(serial)) {
      toast("Serial must be exactly 10 digits.", { variant: "error" });
      return;
    }
    submitSerial(serial);
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

  function onScanInput(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    // Serial is 10 digits only: strip non-digits and cap length
    const raw = el.value.replace(/\D/g, "").slice(0, SERIAL_LENGTH);
    if (el.value !== raw) el.value = raw;
    const newVal = raw;
    const now = Date.now();
    const prevLen = prevLenRef.current;
    const delta = newVal.length - prevLen;

    if (delta >= 2) {
      // Burst of 2+ chars in one event = scanner
      scanningRef.current = true;
      setScanInput(newVal);
      prevLenRef.current = newVal.length;
    } else if (delta === 1) {
      if (prevLen === 0) {
        // First character: allow but don't confirm scanner yet
        setScanInput(newVal);
        prevLenRef.current = newVal.length;
      } else if (now - lastInputTimeRef.current <= SCANNER_THRESHOLD_MS) {
        // Second+ character within threshold = scanner
        scanningRef.current = true;
        setScanInput(newVal);
        prevLenRef.current = newVal.length;
      } else {
        // Single char, too slow = typing; clear immediately
        setScanInput("");
        prevLenRef.current = 0;
        scanningRef.current = false;
        if (el) el.value = "";
        toast("Use barcode scanner only; manual typing is not allowed.", { variant: "error" });
      }
    } else if (delta < 0) {
      // Backspace
      if (scanningRef.current) {
        setScanInput(newVal);
        prevLenRef.current = newVal.length;
      } else {
        setScanInput("");
        prevLenRef.current = 0;
      }
    }
    lastInputTimeRef.current = now;
  }

  function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddScan();
      setScanInput("");
      prevLenRef.current = 0;
      scanningRef.current = false;
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      return;
    }
    // Let single chars and Backspace reach the input so onInput can apply scanner rules
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
          {sessionType === "RETURN_VERIFY" && nonReturnableSet.size > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This task has {nonReturnableSet.size} non-returnable item{nonReturnableSet.size !== 1 ? "s" : ""} in the return. Check with shoot team when you scan them.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{sessionType}</span>
              <span className="text-slate-500">Session active</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={scanInput}
                  onChange={onScanInput}
                  onKeyDown={onScanKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    toast("Use scanner only; typing and paste are not allowed.", { variant: "error" });
                  }}
                  onCopy={(e) => e.preventDefault()}
                  placeholder="Scan 10-digit serial (scanner only)"
                  autoComplete="off"
                  autoFocus
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddScan}
                  disabled={pending || !scanInput.trim() || !SERIAL_DIGITS_ONLY.test(scanInput.trim())}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Add
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">or</span>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Scan with camera
                </button>
              </div>
            </div>
            {message && <p className="mt-3 text-sm text-amber-600">{message}</p>}
          </div>

          <Dialog.Root open={cameraOpen} onOpenChange={setCameraOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">Scan barcode with camera</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Allow camera access and point at a 10-digit barcode.
                </Dialog.Description>
                <div className="mt-4">
                  <CameraBarcodeScanner
                    onScan={(serial) => {
                      submitSerial(serial);
                      setCameraOpen(false);
                    }}
                    onClose={() => setCameraOpen(false)}
                    validate={(v) => SERIAL_DIGITS_ONLY.test(v)}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

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
                  <li key={idx} className={`flex flex-wrap items-center gap-3 px-5 py-2.5 ${sessionType === "RETURN_VERIFY" && nonReturnableSet.has(item.serialId) ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}>
                    <span className={`inline-flex h-2 w-2 rounded-full ${item.scanStatus === "ERROR" ? "bg-red-500" : "bg-emerald-500"}`} />
                    <span className="font-mono text-xs text-slate-700">{item.serialId}</span>
                    {sessionType === "RETURN_VERIFY" && nonReturnableSet.has(item.serialId) && item.scanStatus !== "ERROR" && (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                        Non-returnable — check with shoot team
                      </span>
                    )}
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
