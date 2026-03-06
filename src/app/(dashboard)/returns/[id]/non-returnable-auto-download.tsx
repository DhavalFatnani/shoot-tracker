"use client";

import { useEffect, useRef } from "react";

type SerialRow = { serialId: string; sku: string | null; taskId: string; taskName: string | null; returnable: string; nonReturnReason: string | null };

export function NonReturnableAutoDownload({
  nonReturnableSerials,
  returnLabel,
}: {
  nonReturnableSerials: SerialRow[];
  returnLabel: string;
}) {
  const doneRef = useRef(false);
  useEffect(() => {
    if (nonReturnableSerials.length === 0 || doneRef.current) return;
    doneRef.current = true;
    const headers = ["Serial", "SKU", "Task", "Non-return reason"];
    const rows = nonReturnableSerials.map((s) => [
      s.serialId,
      s.sku ?? "",
      s.taskName ?? "",
      s.nonReturnReason ?? "(marked non-returnable)",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `non-returnable-items-${returnLabel.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nonReturnableSerials, returnLabel]);
  return null;
}
