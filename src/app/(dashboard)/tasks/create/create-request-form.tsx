"use client";

import { useState, useTransition } from "react";
import { createRequest } from "@/app/actions/task-actions";
import { useRouter } from "next/navigation";
import { parseInventoryCsv } from "@/lib/csv";

type Warehouse = { id: string; code: string; name: string };
type Team = { id: string; name: string; type: string };
type ShootReason = "INHOUSE_SHOOT" | "AGENCY_SHOOT" | "INFLUENCER_FITS";
type InputMode = "csv" | "json";

const SHOOT_REASONS: { value: ShootReason; label: string }[] = [
  { value: "INHOUSE_SHOOT", label: "Inhouse Shoot" },
  { value: "AGENCY_SHOOT", label: "Agency Shoot" },
  { value: "INFLUENCER_FITS", label: "Influencer Fits" },
];

export function CreateRequestForm({
  warehouses,
  userShootTeam,
  allShootTeams,
}: {
  warehouses: Warehouse[];
  userShootTeam: { id: string; name: string } | null;
  allShootTeams?: Team[];
}) {
  const [inputMode, setInputMode] = useState<InputMode>("csv");
  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [adminShootTeamId, setAdminShootTeamId] = useState(allShootTeams?.[0]?.id ?? "");
  const [shootReason, setShootReason] = useState<ShootReason>("INHOUSE_SHOOT");
  const [nonReturnIds, setNonReturnIds] = useState<Set<string>>(new Set());
  const [nonReturnReasons, setNonReturnReasons] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const parsedCsv = inputMode === "csv" && csvText.trim() ? parseInventoryCsv(csvText) : { rows: [], errors: [] };
  const hasCsvParseErrors = parsedCsv.errors.length > 0;
  const csvRows = parsedCsv.rows;

  function getSerialIdsAndSkus(): { serialIds: string[]; rows: { serial_id: string; sku: string }[] } {
    if (inputMode === "csv") {
      return {
        serialIds: csvRows.map((r) => r.serial_id),
        rows: csvRows.map((r) => ({ serial_id: r.serial_id, sku: r.sku })),
      };
    }
    try {
      const serials = JSON.parse(jsonText) as { serial_id: string; sku: string }[];
      if (!Array.isArray(serials) || serials.some((s) => typeof s.serial_id !== "string" || typeof s.sku !== "string")) {
        throw new Error("Invalid format");
      }
      return {
        serialIds: serials.map((s) => s.serial_id),
        rows: serials,
      };
    } catch {
      return { serialIds: [], rows: [] };
    }
  }

  function toggleSelected(serialId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(serialId)) next.delete(serialId);
      else next.add(serialId);
      return next;
    });
  }

  function toggleSelectAll(allIds: string[]) {
    setSelectedIds((prev) => {
      if (prev.size === allIds.length) return new Set();
      return new Set(allIds);
    });
  }

  function handleBulkMarkNonReturnable() {
    if (selectedIds.size === 0 || !bulkReason.trim()) return;
    setNonReturnIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      return next;
    });
    setNonReturnReasons((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) next[id] = bulkReason.trim();
      return next;
    });
    setSelectedIds(new Set());
    setBulkReason("");
  }

  function handleBulkClearNonReturnable() {
    setNonReturnIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.delete(id);
      }
      return next;
    });
    setNonReturnReasons((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) delete next[id];
      return next;
    });
    setSelectedIds(new Set());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { serialIds, rows } = getSerialIdsAndSkus();
    if (serialIds.length === 0) {
      setError(inputMode === "csv" ? "No valid rows in CSV. Expect header: Clothing, Size, Bin Location, SKU Code and rows with SN: in Bin Location." : "Invalid JSON: expected array of { serial_id, sku }");
      return;
    }
    if (inputMode === "csv" && hasCsvParseErrors) {
      setError("Fix CSV parse errors before submitting.");
      return;
    }

    const missingReason = [...nonReturnIds].find((id) => !nonReturnReasons[id]?.trim());
    if (missingReason) {
      setError(`Please provide a reason for not returning serial ${missingReason}.`);
      return;
    }

    const nonReturnSerials = [...nonReturnIds].map((id) => ({
      serial_id: id,
      reason: nonReturnReasons[id]!,
    }));

    const formData = new FormData();
    formData.set("serialIds", JSON.stringify(serialIds));
    formData.set("serials", JSON.stringify(rows));
    formData.set("warehouseId", warehouseId);
    formData.set("shootReason", shootReason);
    if (nonReturnSerials.length > 0) {
      formData.set("nonReturnSerials", JSON.stringify(nonReturnSerials));
    }
    if (allShootTeams && adminShootTeamId) {
      formData.set("shootTeamId", adminShootTeamId);
    }
    startTransition(async () => {
      try {
        const result = await createRequest(formData);
        if (result.success && result.data) {
          const skipped = (result.data as { skipped?: string[] }).skipped ?? [];
          if (skipped.length > 0) {
            const skippedWithSku = skipped.map((id) => {
              const row = rows.find((r) => r.serial_id === id);
              return row ? `${id} (${row.sku})` : id;
            });
            setError(`Request created. Some serials were skipped (not eligible): ${skippedWithSku.join(", ")}`);
          }
          router.push(`/tasks/${result.data.taskId}`);
          router.refresh();
        } else {
          setError(result.error ?? "Failed");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setInputMode("csv");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const { serialIds, rows: currentRows } = getSerialIdsAndSkus();
  const canSubmit = serialIds.length > 0 && (inputMode !== "csv" || !hasCsvParseErrors);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {/* Shoot reason */}
      <div className="section-card p-5">
        <p className="label">Reason for shoot</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {SHOOT_REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-colors ${
                shootReason === r.value
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="shootReason"
                value={r.value}
                checked={shootReason === r.value}
                onChange={() => setShootReason(r.value)}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Input mode selector */}
      <div className="section-card p-5">
        <p className="label">Input format</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          CSV: Clothing, Size, Bin Location, SKU Code. Serial number is read from Bin Location (e.g. &quot;A32-S4-B1 • SN: 0000043569 • Store: 230&quot;). SKU and Serial Number mapping is kept in all outputs.
        </p>
        <div className="mt-4 flex gap-4">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 transition-colors has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === "csv"}
              onChange={() => setInputMode("csv")}
              className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">CSV (paste or upload)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 transition-colors has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
            <input
              type="radio"
              name="inputMode"
              checked={inputMode === "json"}
              onChange={() => setInputMode("json")}
              className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">JSON</span>
          </label>
        </div>
      </div>

      {/* CSV / JSON input */}
      {inputMode === "csv" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-900">CSV data</label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload file
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Clothing,Size,Bin Location ,SKU Code\nhttps://knotnow.co/product/888?size_id=ld_3380859,S,A32-S4-B1 • SN: 0000043569 • Store: 230,CP0018_S`}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            rows={8}
          />
          {parsedCsv.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Parse issues</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
                {parsedCsv.errors.map((err, i) => (
                  <li key={i}>Line {err.line}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="text-sm font-semibold text-slate-900">Serial list (JSON)</label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='[{"serial_id":"0000043569","sku":"CP0018_S"},{"serial_id":"0000056027","sku":"W1-NISH-WHT-M-879"}]'
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            rows={6}
          />
        </div>
      )}

      {/* Serial preview with selection-based bulk non-returnable */}
      {currentRows.length > 0 && (
        <div className="section-card">
          {/* Bulk action bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {currentRows.length} serial{currentRows.length !== 1 ? "s" : ""}
              {nonReturnIds.size > 0 && (
                <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                  ({nonReturnIds.size} non-returnable)
                </span>
              )}
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedIds.size} selected
                  </span>
                  {[...selectedIds].some((id) => nonReturnIds.has(id)) && (
                    <button
                      type="button"
                      onClick={handleBulkClearNonReturnable}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Mark returnable
                    </button>
                  )}
                  <input
                    type="text"
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    placeholder="Reason (e.g. Gifted)"
                    className="input w-44 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleBulkMarkNonReturnable}
                    disabled={!bulkReason.trim()}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    Mark non-returnable
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Scrollable table */}
          <div className="max-h-80 overflow-y-auto">
            <table className="table table-sticky table-row-hover w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="table-th w-10">
                    <input
                      type="checkbox"
                      checked={currentRows.length > 0 && selectedIds.size === currentRows.slice(0, 100).length}
                      onChange={() => toggleSelectAll(currentRows.slice(0, 100).map((r) => r.serial_id))}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                    />
                  </th>
                  <th className="table-th">Serial</th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Reason</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.slice(0, 100).map((r) => {
                  const isNonReturn = nonReturnIds.has(r.serial_id);
                  const isSelected = selectedIds.has(r.serial_id);
                  return (
                    <tr
                      key={r.serial_id}
                      className={`cursor-pointer ${isNonReturn ? "bg-amber-50/50 dark:bg-amber-900/10" : ""} ${isSelected ? "bg-indigo-50/60 dark:bg-indigo-900/15" : ""}`}
                      onClick={() => toggleSelected(r.serial_id)}
                    >
                      <td className="table-td" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(r.serial_id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                        />
                      </td>
                      <td className="table-td font-mono text-xs">{r.serial_id}</td>
                      <td className="table-td">{r.sku}</td>
                      <td className="table-td">
                        {isNonReturn ? (
                          <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">Non-returnable</span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">Returnable</span>
                        )}
                      </td>
                      <td className="table-td text-xs text-slate-500 dark:text-slate-400">
                        {isNonReturn ? (nonReturnReasons[r.serial_id] ?? "—") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {currentRows.length > 100 && (
            <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              … and {currentRows.length - 100} more
            </p>
          )}
        </div>
      )}

      {/* Warehouse & Team */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-900">Warehouse</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-900">Shoot team</label>
          {allShootTeams ? (
            <select
              value={adminShootTeamId}
              onChange={(e) => setAdminShootTeamId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {allShootTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : userShootTeam ? (
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
              {userShootTeam.name}
            </p>
          ) : (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              You are not assigned to a shoot team. Contact your admin.
            </p>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="form-actions">
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="btn btn-primary"
        >
        {pending ? (
          <>
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating…
          </>
        ) : (
          "Create request"
        )}
        </button>
      </div>
    </form>
  );
}
