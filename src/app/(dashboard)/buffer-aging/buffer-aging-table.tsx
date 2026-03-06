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
      const result = await getBufferAgingList(formData);
      if (result.success && result.data) setItems(result.data.items);
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
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV
          </button>
          <div>
            <label htmlFor="min-days" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Min days in buffer
            </label>
            <input
              id="min-days"
              type="number"
              min={0}
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              placeholder="e.g. 7"
              disabled={pending}
              className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            />
          </div>
          <button
            onClick={handleFilter}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-800"
          >
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Serial</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">SKU</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Location</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Days</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No items in buffer
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i.serialId} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50">
                <td className="px-5 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-200">{i.serialId}</td>
                <td className="px-5 py-3 text-zinc-700 dark:text-zinc-200">{i.sku}</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{i.currentLocation}</td>
                <td className={`px-5 py-3 ${daysColor(i.daysInBuffer)}`}>{i.daysInBuffer}d</td>
                <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">{formatDateTimeIST(i.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
