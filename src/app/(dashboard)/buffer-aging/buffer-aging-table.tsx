"use client";

import { useState, useTransition } from "react";
import { getBufferAgingList } from "@/app/actions/buffer-actions";
import { formatDateTimeIST } from "@/lib/format-date";
import { buildCsv, downloadCsv } from "@/lib/csv";

type Item = { serialId: string; sku: string; currentLocation: string; updatedAt: Date | string; daysInBuffer: number };

function daysColor(days: number) {
  if (days >= 14) return "text-red-600 font-semibold";
  if (days >= 7) return "text-amber-600 font-medium";
  return "text-slate-700";
}

export function BufferAgingTable({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [minDays, setMinDays] = useState("");
  const [pending, startTransition] = useTransition();

  function handleFilter() {
    const formData = new FormData();
    formData.set("minDaysInBuffer", minDays);
    formData.set("limit", "100");
    startTransition(async () => {
      try {
        const result = await getBufferAgingList(formData);
        if (result.success && result.data) setItems(result.data.items);
      } catch {
        // Ignore or set error state if component supports it
      }
    });
  }

  function handleDownloadCsv() {
    const headers = ["Serial", "SKU", "Location", "Days in buffer", "Updated"];
    const rows = items.map((i) => [i.serialId, i.sku, i.currentLocation, i.daysInBuffer, formatDateTimeIST(i.updatedAt)]);
    const csv = buildCsv(headers, rows);
    downloadCsv(csv, `buffer-serials-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="filter-bar">
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={items.length === 0}
            className="btn btn-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV
          </button>
          <div className="form-group">
            <label htmlFor="min-days" className="label">Min days in buffer</label>
            <input
              id="min-days"
              type="number"
              min={0}
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              placeholder="e.g. 7"
              disabled={pending}
              className="input w-32"
            />
          </div>
          <button onClick={handleFilter} disabled={pending} className="btn btn-primary">
            {pending ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Filtering…
              </>
            ) : (
              "Filter"
            )}
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table table-sticky table-row-hover">
          <thead>
            <tr>
              <th className="table-th">Serial</th>
              <th className="table-th">SKU</th>
              <th className="table-th">Location</th>
              <th className="table-th">Days</th>
              <th className="table-th">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="table-td py-12 text-center">
                  No items in buffer
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i.serialId}>
                <td className="table-td font-mono text-xs">{i.serialId}</td>
                <td className="table-td">{i.sku}</td>
                <td className="table-td text-slate-500 dark:text-slate-400">{i.currentLocation}</td>
                <td className={`table-td ${daysColor(i.daysInBuffer)}`}>{i.daysInBuffer}d</td>
                <td className="table-td text-slate-500 dark:text-slate-400">{formatDateTimeIST(i.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
