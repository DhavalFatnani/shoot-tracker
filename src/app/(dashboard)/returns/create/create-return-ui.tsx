"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { commitReturn, getShootInventory } from "@/app/actions/return-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { CameraBarcodeScanner } from "@/components/camera-barcode-scanner";
import { useToast } from "@/components/ui/toaster";
import { formatTaskSerial } from "@/lib/format-serials";

type InventoryItem = {
  taskId: string;
  taskSerial: number;
  taskName: string | null;
  serialId: string;
  sku: string;
  currentLocation: string;
  status: string;
  receivedAt: string | Date | null;
  returnable?: string;
  nonReturnReason?: string | null;
};

type ScanEntry = {
  serialId: string;
  ok: boolean;
  error?: string;
  taskId?: string;
  taskSerial?: number;
  taskName?: string | null;
  sku?: string;
};

function formatAgingFromReceived(receivedAt: string | Date | null): string {
  if (!receivedAt) return "—";
  const received = typeof receivedAt === "string" ? new Date(receivedAt) : receivedAt;
  const now = new Date();
  const days = Math.floor((now.getTime() - received.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "—";
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** Max length for serial input (scanner or manual). */
const SERIAL_INPUT_MAX_LENGTH = 256;
/** Max ms between key events to treat as scanner (not human typing). */
const SCANNER_THRESHOLD_MS = 20;

export function CreateReturnUI({ initialInventory, taskId }: { initialInventory: InventoryItem[]; taskId?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [phase, setPhase] = useState<"inventory" | "scan" | "done">("inventory");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<ScanEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ returnId?: string; totalReturned: number; summary: { taskId: string; taskName: string | null; taskSerial: number; count: number }[] } | null>(null);
  const [partialConfirmOpen, setPartialConfirmOpen] = useState(false);
  const [nonReturnableConfirmOpen, setNonReturnableConfirmOpen] = useState(false);
  const [pendingNonReturnable, setPendingNonReturnable] = useState<{ serialId: string; item: InventoryItem } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const lastInputTimeRef = useRef(0);
  const prevLenRef = useRef(0);
  const scanningRef = useRef(false);

  const inventoryMap = useMemo(
    () => new Map(inventory.map((i) => [i.serialId, i])),
    [inventory]
  );

  const byTask = useMemo(() => {
    const map = new Map<string, { taskName: string | null; taskSerial: number; items: InventoryItem[] }>();
    for (const item of inventory) {
      const existing = map.get(item.taskId);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.taskId, { taskName: item.taskName, taskSerial: item.taskSerial, items: [item] });
      }
    }
    return map;
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (!filter.trim()) return inventory;
    const q = filter.toLowerCase();
    return inventory.filter(
      (i) =>
        i.serialId.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.taskName ?? "").toLowerCase().includes(q)
    );
  }, [inventory, filter]);

  const scannedSet = useMemo(
    () => new Set(scanned.filter((s) => s.ok).map((s) => s.serialId)),
    [scanned]
  );

  const scannedByTask = useMemo(() => {
    const map = new Map<string, { taskName: string | null; taskSerial: number; serials: string[] }>();
    for (const s of scanned) {
      if (!s.ok || !s.taskId || s.taskSerial == null) continue;
      const existing = map.get(s.taskId);
      if (existing) {
        existing.serials.push(s.serialId);
      } else {
        map.set(s.taskId, { taskName: s.taskName ?? null, taskSerial: s.taskSerial, serials: [s.serialId] });
      }
    }
    return map;
  }, [scanned]);

  /** Tasks where we're returning only some serials (partial return). Key = taskId, value = { taskName, taskSerial, notReturning } */
  const partialReturnByTask = useMemo(() => {
    const map = new Map<string, { taskName: string | null; taskSerial: number; notReturning: InventoryItem[] }>();
    for (const [taskId, { taskName, taskSerial, items }] of byTask.entries()) {
      const returningCount = scannedByTask.get(taskId)?.serials.length ?? 0;
      if (returningCount > 0 && returningCount < items.length) {
        const notReturning = items.filter((i) => !scannedSet.has(i.serialId));
        map.set(taskId, { taskName, taskSerial, notReturning });
      }
    }
    return map;
  }, [byTask, scannedByTask, scannedSet]);

  /** Process a scanned serial: validate, check inventory, add to scanned list. If non-returnable, ask for confirmation first. */
  function processSerial(serialId: string) {
    const id = serialId.trim();
    if (!id) {
      toast("Enter or scan a serial number.", { variant: "error" });
      return;
    }
    if (scannedSet.has(id)) {
      setScanned((prev) => [...prev, { serialId: id, ok: false, error: "Already scanned" }]);
      toast("Already scanned", { variant: "error" });
      return;
    }
    const item = inventoryMap.get(id);
    if (!item) {
      setScanned((prev) => [...prev, { serialId: id, ok: false, error: "Not in shoot inventory" }]);
      toast("Not in shoot inventory", { variant: "error" });
      return;
    }
    if (item.returnable === "0") {
      setPendingNonReturnable({ serialId: id, item });
      setNonReturnableConfirmOpen(true);
      return;
    }
    addScannedEntry(item);
  }

  function addScannedEntry(item: InventoryItem) {
    setScanned((prev) => [
      ...prev,
      { serialId: item.serialId, ok: true, taskId: item.taskId, taskSerial: item.taskSerial, taskName: item.taskName, sku: item.sku },
    ]);
  }

  const handleScan = () => {
    const serialId = scanInput.trim();
    if (!serialId) return;
    processSerial(serialId);
    setScanInput("");
    prevLenRef.current = 0;
    scanningRef.current = false;
  };

  function onScanInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.slice(0, SERIAL_INPUT_MAX_LENGTH);
    const now = Date.now();
    const prevLen = prevLenRef.current;
    const delta = raw.length - prevLen;
    if (delta >= 2) {
      scanningRef.current = true;
      setScanInput(raw);
      prevLenRef.current = raw.length;
    } else if (delta === 1) {
      if (prevLen === 0) {
        setScanInput(raw);
        prevLenRef.current = raw.length;
      } else if (now - lastInputTimeRef.current <= SCANNER_THRESHOLD_MS) {
        scanningRef.current = true;
        setScanInput(raw);
        prevLenRef.current = raw.length;
      } else {
        setScanInput("");
        prevLenRef.current = 0;
        scanningRef.current = false;
        toast("Use barcode scanner only; manual typing is not allowed.", { variant: "error" });
      }
    } else if (delta < 0) {
      if (scanningRef.current) {
        setScanInput(raw);
        prevLenRef.current = raw.length;
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
      handleScan();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
    }
  }

  const handleRemoveScan = (serialId: string) => {
    setScanned((prev) => prev.filter((s) => s.serialId !== serialId));
  };

  const doCommit = () => {
    const validSerials = scanned.filter((s) => s.ok).map((s) => s.serialId);
    if (validSerials.length === 0) return;

    setError(null);
    setPartialConfirmOpen(false);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("serialIds", JSON.stringify(validSerials));
        const res = await commitReturn(fd);
        if (res.success && res.data) {
          setResult(res.data);
          setPhase("done");
        } else {
          setError(res.error ?? "Failed to create return");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  };

  const handleCommit = () => {
    const validSerials = scanned.filter((s) => s.ok).map((s) => s.serialId);
    if (validSerials.length === 0) return;

    if (partialReturnByTask.size > 0) {
      setPartialConfirmOpen(true);
      return;
    }
    doCommit();
  };

  const handleRefreshInventory = () => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        if (taskId) fd.set("taskId", taskId);
        const res = await getShootInventory(fd);
        if (res.success && res.data) {
          setInventory(res.data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to refresh inventory. Please try again.");
      }
    });
  };

  const okCount = scanned.filter((s) => s.ok).length;
  const errCount = scanned.filter((s) => !s.ok).length;

  if (phase === "done" && result) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">Return created</h2>
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {result.totalReturned} serial{result.totalReturned !== 1 ? "s" : ""} moved to buffer across {result.summary.length} task{result.summary.length !== 1 ? "s" : ""}.
          </p>
          <div className="mt-4 space-y-2">
            {result.summary.map((s) => (
              <div key={s.taskId} className="flex items-center gap-3 rounded-lg bg-white/70 px-4 py-2.5 dark:bg-slate-800/70">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.taskName ?? formatTaskSerial(s.taskSerial)}</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {s.count} serial{s.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400">
            OPS team will verify these returns via Return Verify sessions on each task.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {result.returnId && (
            <Link
              href={`/returns/${result.returnId}`}
              className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              View return
            </Link>
          )}
          <button
            onClick={() => { setPhase("inventory"); setScanned([]); setResult(null); handleRefreshInventory(); }}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Create another return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventory summary */}
      <div className="section-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Shoot Team Inventory
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {inventory.length} serial{inventory.length !== 1 ? "s" : ""} across {byTask.size} task{byTask.size !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshInventory}
              disabled={pending}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
            {phase === "inventory" && inventory.length > 0 && (
              <button
                onClick={() => setPhase("scan")}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"
              >
                Start Scanning
              </button>
            )}
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No serials currently with the shoot team.</p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by serial, SKU, or task..."
                className="input w-full"
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-800/90">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Serial</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">SKU</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Task</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Location</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Aging (from received)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredInventory.map((item) => (
                    <tr
                      key={`${item.taskId}-${item.serialId}`}
                      className={`transition-colors ${scannedSet.has(item.serialId) ? "bg-emerald-50/50 opacity-60 dark:bg-emerald-900/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"}`}
                    >
                      <td className="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {item.serialId}
                        {scannedSet.has(item.serialId) && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">scanned</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{item.sku}</td>
                      <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{item.taskName ?? formatTaskSerial(item.taskSerial)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                          {item.currentLocation}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
                        {formatAgingFromReceived(item.receivedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Scan phase - same scanning module as session scan */}
      {phase === "scan" && (
        <>
          <div className="section-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Scan serials to return</h3>
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
                  placeholder="Scan serial (scanner only)"
                  autoComplete="off"
                  autoFocus
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={pending || !scanInput.trim()}
                  className="btn btn-primary"
                >
                  Add
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">or</span>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  disabled={pending}
                  className="btn btn-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Scan with camera
                </button>
              </div>
            </div>
          </div>

          <Dialog.Root open={cameraOpen} onOpenChange={setCameraOpen}>
            <Dialog.DialogPortal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">Scan barcode with camera</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Allow camera access and point at the serial barcode.
                </Dialog.Description>
                <div className="mt-4">
                  <CameraBarcodeScanner
                    onScan={(serial) => {
                      processSerial(serial);
                      setCameraOpen(false);
                    }}
                    onClose={() => setCameraOpen(false)}
                    validate={(v) => v.trim().length > 0}
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
            </Dialog.DialogPortal>
          </Dialog.Root>

          {/* Scanned items list */}
          <div className="section-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Scanned ({scanned.length})
              </h3>
              <div className="flex items-center gap-3 text-xs">
                {okCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">{okCount} OK</span>}
                {errCount > 0 && <span className="text-red-600 dark:text-red-400">{errCount} errors</span>}
              </div>
            </div>

            {scanned.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No items scanned yet. Use the barcode scanner above.
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                {scanned.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`inline-flex h-2 w-2 rounded-full ${item.ok ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{item.serialId}</span>
                    {item.ok && item.sku && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{item.sku}</span>
                    )}
                    {item.ok && item.taskName && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">({item.taskName})</span>
                    )}
                    {!item.ok && item.error && (
                      <span className="text-xs text-red-600 dark:text-red-400">{item.error}</span>
                    )}
                    {item.ok && (
                      <button
                        onClick={() => handleRemoveScan(item.serialId)}
                        className="ml-auto text-xs text-slate-400 hover:text-red-500 transition dark:text-slate-500 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Summary by task */}
          {scannedByTask.size > 0 && (
            <div className="section-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Return summary by task</h3>
              <div className="space-y-2">
                {Array.from(scannedByTask.entries()).map(([taskId, { taskName, taskSerial, serials }]) => (
                  <div key={taskId} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{taskName ?? formatTaskSerial(taskSerial)}</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {serials.length} serial{serials.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCommit}
              disabled={pending || okCount === 0}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {pending ? "Submitting..." : `Commit Return (${okCount} serial${okCount !== 1 ? "s" : ""})`}
            </button>
            <button
              onClick={() => { setPhase("inventory"); setScanned([]); setError(null); }}
              disabled={pending}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>

          {/* Non-returnable item confirmation: shoot team intended this item not to be returned */}
          <ConfirmDialog
            open={nonReturnableConfirmOpen}
            onOpenChange={(open) => {
              setNonReturnableConfirmOpen(open);
              if (!open) setPendingNonReturnable(null);
            }}
            title="Include non-returnable item?"
            description={
              pendingNonReturnable
                ? `Serial ${pendingNonReturnable.serialId} was marked as non-returnable at request creation${pendingNonReturnable.item.nonReturnReason ? ` (${pendingNonReturnable.item.nonReturnReason})` : ""}. Including it is against that intention. Confirm you want to add it to this return?`
                : ""
            }
            confirmLabel="Yes, include in return"
            cancelLabel="Cancel"
            variant="danger"
            onConfirm={() => {
              if (pendingNonReturnable) {
                addScannedEntry(pendingNonReturnable.item);
                setPendingNonReturnable(null);
                setNonReturnableConfirmOpen(false);
                setScanInput("");
                prevLenRef.current = 0;
                scanningRef.current = false;
              }
            }}
          />

          {/* Partial return confirmation: detailed modal */}
          <Dialog.Root open={partialConfirmOpen} onOpenChange={setPartialConfirmOpen}>
            <Dialog.DialogPortal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/60" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg max-h-[85vh] translate-x-[-50%] translate-y-[-50%] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
                <div className="p-6 pb-4 flex-shrink-0">
                  <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Partial return
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Confirm which serials will not be returned and will stay with you for future use.
                  </Dialog.Description>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                    The following serials are not included in this return. They will remain with you for future shoots or other use.
                  </p>
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {Array.from(partialReturnByTask.values()).reduce((n, { notReturning }) => n + notReturning.length, 0)} serials across {partialReturnByTask.size} task{partialReturnByTask.size !== 1 ? "s" : ""} will stay with you
                  </p>
                </div>
                <div className="px-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                  {Array.from(partialReturnByTask.entries()).map(([taskId, { taskName, taskSerial, notReturning }]) => (
                    <div
                      key={taskId}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-700/50"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {taskName ?? formatTaskSerial(taskSerial)}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                          {notReturning.length} not returned
                        </span>
                      </div>
                      <ul className="flex flex-wrap gap-1.5">
                        {notReturning.map((item) => (
                          <li
                            key={item.serialId}
                            className="font-mono text-xs px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
                          >
                            {item.serialId}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="p-6 pt-4 flex-shrink-0 border-t border-slate-100 dark:border-slate-600 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      Back
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={() => {
                      doCommit();
                      setPartialConfirmOpen(false);
                    }}
                    disabled={pending}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                  >
                    {pending ? "Submitting…" : "Confirm partial return"}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.DialogPortal>
          </Dialog.Root>
        </>
      )}
    </div>
  );
}
