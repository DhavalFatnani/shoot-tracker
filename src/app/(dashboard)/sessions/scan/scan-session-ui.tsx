"use client";

import { useState, useTransition, useRef, useMemo, useCallback, useEffect } from "react";
import { startSession, addScan, commitSession, cancelSession } from "@/app/actions/session-actions";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CameraBarcodeScanner } from "@/components/camera-barcode-scanner";
import { useToast } from "@/components/ui/toaster";

type SessionItem = { sessionId: string; serialId: string; scanStatus: string; errorReason: string | null; scannedAt: number };

type ScanFeedback = {
  serialId: string;
  status: "OK" | "ERROR" | "DUPLICATE";
  message: string;
};

function vibrate(pattern: number | number[]) {
  try { navigator?.vibrate?.(pattern); } catch {}
}

type SessionType = "PICK" | "RECEIPT" | "RETURN_SCAN" | "RETURN_VERIFY";

const SESSION_TYPES_BY_ROLE: Record<string, { value: SessionType; label: string; shortLabel: string }[]> = {
  SHOOT_USER: [
    { value: "RECEIPT", label: "Receipt", shortLabel: "RECEIVE" },
    { value: "RETURN_SCAN", label: "Return scan", shortLabel: "RETURN" },
  ],
  OPS_USER: [
    { value: "PICK", label: "Pick", shortLabel: "PICK MODE" },
    { value: "RETURN_VERIFY", label: "Return verify", shortLabel: "RETURN" },
  ],
  ADMIN: [
    { value: "PICK", label: "Pick", shortLabel: "PICK MODE" },
    { value: "RECEIPT", label: "Receipt", shortLabel: "RECEIVE" },
    { value: "RETURN_SCAN", label: "Return scan", shortLabel: "RETURN" },
    { value: "RETURN_VERIFY", label: "Return verify", shortLabel: "RETURN" },
  ],
};

function formatScannedTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ScanSessionUI({
  taskId,
  userRole,
  defaultSessionType,
  nonReturnableSerialIds = [],
  taskDisplayName,
  taskSerial,
  autoStart = false,
}: {
  taskId: string;
  userRole: string;
  defaultSessionType?: string;
  nonReturnableSerialIds?: string[];
  taskDisplayName?: string;
  taskSerial?: string;
  autoStart?: boolean;
}) {
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
  const [lastScannedSerial, setLastScannedSerial] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const lastInputTimeRef = useRef(0);
  const prevLenRef = useRef(0);
  const scanningRef = useRef(false);

  const flashHighlight = useCallback((serialId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setLastScannedSerial(serialId);
    highlightTimerRef.current = setTimeout(() => setLastScannedSerial(null), 2500);
  }, []);

  const showScanFeedback = useCallback((fb: ScanFeedback) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setScanFeedback(fb);
    feedbackTimerRef.current = setTimeout(() => setScanFeedback(null), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

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
      try {
        const result = await startSession(formData);
        if (result.success && result.data) {
          setSessionId(result.data.sessionId);
          setItems([]);
        } else {
          setMessage(result.error ?? "Failed to start session");
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && !sessionId) {
      autoStartedRef.current = true;
      handleStartSession();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function submitSerial(serial: string) {
    if (!sessionId || !SERIAL_DIGITS_ONLY.test(serial)) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("serialId", serial);
    startTransition(async () => {
      try {
        const result = await addScan(formData);
        if (result.success && result.data) {
          const isDuplicate = result.data.ok === false && result.data.error === "DUPLICATE";
          if (isDuplicate) {
            const prev = items.find((i) => i.serialId === serial);
            const dupMsg = prev
              ? `Already scanned at ${formatScannedTime(prev.scannedAt)}`
              : "Already scanned in this session";
            setMessage(dupMsg);
            vibrate([100, 50, 100, 50, 100]);
            showScanFeedback({ serialId: serial, status: "DUPLICATE", message: dupMsg });
            if (prev) flashHighlight(serial);
            setScanInput("");
            prevLenRef.current = 0;
            scanningRef.current = false;
          } else {
            const isError = result.data?.ok === false;
            vibrate(isError ? [200, 100, 200] : [80]);
            setItems((prev) => [
              ...prev,
              { sessionId, serialId: serial, scanStatus: result.data!.scanStatus ?? "OK", errorReason: result.data?.errorReason ?? null, scannedAt: Date.now() },
            ]);
            flashHighlight(serial);
            showScanFeedback({
              serialId: serial,
              status: isError ? "ERROR" : "OK",
              message: isError
                ? (result.data?.errorReason ?? "Unrecognized serial")
                : "Scanned successfully",
            });
            setScanInput("");
            prevLenRef.current = 0;
            scanningRef.current = false;
            setMessage(isError ? (result.data?.message ?? "Error") : null);
          }
        } else {
          vibrate([200, 100, 200]);
          setMessage(result.error ?? "Failed to add scan");
        }
      } catch (e) {
        vibrate([200, 100, 200]);
        setMessage(e instanceof Error ? e.message : "Something went wrong. Please try again.");
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
      try {
        const result = await commitSession(formData);
        if (result.success) {
          const disputeCount = (result as { autoDisputeCount?: number }).autoDisputeCount ?? 0;
          if (disputeCount > 0) {
            toast(
              `Session committed. ${disputeCount} auto-dispute${disputeCount !== 1 ? "s" : ""} raised for non-returnable item${disputeCount !== 1 ? "s" : ""}.`,
              { variant: "success" }
            );
          } else {
            toast("Session committed successfully.", { variant: "success" });
          }
          setSessionId(null);
          setItems([]);
          router.refresh();
        } else {
          setMessage(result.error ?? "Failed to commit");
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Something went wrong. Please try again.");
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

  const modeLabel = (value: SessionType) => {
    const t = allowedTypes.find((x) => x.value === value);
    return t?.shortLabel ?? t?.label ?? value;
  };

  return (
    <div className="space-y-6">
      {!sessionId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Start a scan session</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Choose a mode and start the session to begin scanning.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {allowedTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSessionType(t.value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  sessionType === t.value
                    ? "border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t.value === "PICK" && (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                )}
                {(t.value === "RECEIPT" || t.value === "RETURN_SCAN") && (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
                {t.value === "RETURN_VERIFY" && (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {modeLabel(t.value)}
              </button>
            ))}
            <button
              type="button"
              onClick={handleStartSession}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {pending ? "Starting…" : "Start session"}
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{message}</p>}
        </div>
      ) : (
        <>
          {(sessionType === "RETURN_VERIFY" || sessionType === "RETURN_SCAN") && nonReturnableSet.size > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This task has {nonReturnableSet.size} non-returnable item{nonReturnableSet.size !== 1 ? "s" : ""}.
                They can still be scanned &mdash; a dispute will be auto-raised on commit for team discussion.
              </p>
            </div>
          )}

          {/* Scanning card: dark panel only (session type was selected outside) */}
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
            <div
              className="relative min-h-[320px] bg-[#1e293b] dark:bg-[#0f172a]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="flex min-h-[320px] flex-col p-8">
              <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
                {/* Scanner target: solid dark circle + lighter corner brackets */}
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: "#3730a3" }}
                  aria-hidden
                >
                  <svg className="h-14 w-14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M0 8 L0 0 L8 0" />
                    <path d="M16 0 L24 0 L24 8" />
                    <path d="M0 16 L0 24 L8 24" />
                    <path d="M16 24 L24 24 L24 16" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Ready to scan</p>
                  <p className="mt-1.5 text-sm text-slate-400">
                    Use the barcode scanner for input below.
                  </p>
                </div>
                {/* Manual input: light grey field + purple ENTER */}
                <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-500">
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={scanInput}
                      onChange={onScanInput}
                      onKeyDown={onScanKeyDown}
                      onPaste={(e) => { e.preventDefault(); toast("Use scanner only; typing and paste are not allowed.", { variant: "error" }); }}
                      onCopy={(e) => e.preventDefault()}
                      placeholder="1000100575"
                      autoComplete="off"
                      autoFocus
                      className="w-full rounded-lg border border-slate-400/50 bg-slate-200/90 py-3 pl-12 pr-3 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:bg-slate-300/90 dark:text-slate-900 dark:placeholder-slate-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddScan}
                    disabled={pending || !scanInput.trim() || !SERIAL_DIGITS_ONLY.test(scanInput.trim())}
                    className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    ENTER
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  disabled={pending}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Or scan with camera
                </button>
              </div>
              {/* Camera status bottom-left only */}
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-white/80">
                  Camera: {cameraOpen ? "Active" : "Ready"}
                </span>
                {message && <span className="text-sm text-amber-400">{message}</span>}
              </div>
            </div>
            </div>
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

          {/* Scanned items + Session summary: table left, summary right */}
          <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Scanned Items ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Clear list
                </button>
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                  No items scanned yet. Use the scanner above or enter a serial and press ENTER.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        <th className="px-4 py-3">Serial no.</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const isHighlighted = lastScannedSerial === item.serialId;
                        const isNonReturnable = (sessionType === "RETURN_VERIFY" || sessionType === "RETURN_SCAN") && nonReturnableSet.has(item.serialId);
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-slate-100 last:border-0 transition-colors duration-700 dark:border-slate-800 ${
                              isHighlighted
                                ? "bg-indigo-100 dark:bg-indigo-900/30"
                                : isNonReturnable
                                  ? "bg-amber-50/50 dark:bg-amber-900/10"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono text-sm">
                              <span className={item.scanStatus === "ERROR" ? "text-red-600 dark:text-red-400" : "text-indigo-600 dark:text-indigo-400"}>
                                #{item.serialId}
                              </span>
                              {isHighlighted && (
                                <span className="ml-2 inline-flex animate-pulse rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  JUST SCANNED
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">—</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                              {formatScannedTime(item.scannedAt)}
                            </td>
                            <td className="px-4 py-2.5">
                              {item.scanStatus === "ERROR" ? (
                                <span className="font-medium text-red-600 dark:text-red-400">Unrecognized</span>
                              ) : (
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">Verified</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Session summary + Finish CTA */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Summary</h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Scanned</dt>
                  <dd className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-100">{items.length} items</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Accuracy</dt>
                  <dd className="mt-1 flex items-center gap-3">
                    {items.length > 0 ? (
                      <>
                        <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                          {Math.round((okCount / items.length) * 100)}%
                        </span>
                        <div className="h-2.5 flex-1 min-w-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                            style={{ width: `${(okCount / items.length) * 100}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </dd>
                </div>
              </dl>
              {items.length > 0 && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {okCount === items.length
                    ? "All items verified. Finish the session when done."
                    : `${errCount} unrecognized. Check and rescan if needed.`}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={pending || items.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {pending ? "Committing…" : "Finish Session"}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-center text-sm text-slate-500 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-300"
                >
                  Cancel session
                </button>
              </div>
            </div>
          </div>

          {/* Scan feedback popup */}
          {scanFeedback && (
            <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
              <div
                className={`pointer-events-auto animate-in fade-in zoom-in-95 flex w-[min(calc(100vw-3rem),20rem)] flex-col items-center gap-3 rounded-2xl p-6 shadow-2xl ${
                  scanFeedback.status === "OK"
                    ? "bg-emerald-600 text-white"
                    : scanFeedback.status === "DUPLICATE"
                      ? "bg-amber-500 text-white"
                      : "bg-red-600 text-white"
                }`}
                onClick={() => setScanFeedback(null)}
                role="status"
                aria-live="assertive"
              >
                {scanFeedback.status === "OK" && (
                  <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {scanFeedback.status === "DUPLICATE" && (
                  <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                )}
                {scanFeedback.status === "ERROR" && (
                  <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <p className="text-center font-mono text-xl font-bold tracking-wide">
                  #{scanFeedback.serialId}
                </p>
                <p className="text-center text-sm font-medium opacity-90">
                  {scanFeedback.message}
                </p>
              </div>
            </div>
          )}

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
