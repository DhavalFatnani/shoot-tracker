"use client";

import { useState } from "react";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { formatReturnSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";

type Props = {
  returnLabel: string;
  serial: number;
  name: string | null;
  totalSerials: number;
  taskCount: number;
  verifiedCount: number;
  createdAt: Date | string;
  dispatchedAt: Date | string | null;
  closedAt: Date | string | null;
};

export function ReturnDetailCsvDownload({
  returnLabel,
  serial,
  name,
  totalSerials,
  taskCount,
  verifiedCount,
  createdAt,
  dispatchedAt,
  closedAt,
}: Props) {
  const [pending, setPending] = useState(false);

  function handleDownload() {
    setPending(true);
    try {
      const allVerified = totalSerials > 0 && verifiedCount === totalSerials;
      const status = closedAt ? "Closed" : allVerified ? "Verified" : dispatchedAt ? "In transit" : "Return created";
      const headers = ["Return code", "Name", "Status", "Units", "Tasks", "Verified", "Created", "Dispatched", "Closed"];
      const rows = [
        [
          formatReturnSerial(serial),
          name ?? formatReturnSerial(serial),
          status,
          totalSerials,
          taskCount,
          verifiedCount,
          formatDateTimeIST(createdAt),
          dispatchedAt ? formatDateTimeIST(dispatchedAt) : "",
          closedAt ? formatDateTimeIST(closedAt) : "",
        ],
      ];
      const csv = buildCsv(headers, rows);
      const safeLabel = returnLabel.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      downloadCsv(csv, `return-${safeLabel}-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={pending}
      className="btn btn-secondary"
    >
      {pending ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {pending ? "Preparing…" : "Download CSV"}
    </button>
  );
}
