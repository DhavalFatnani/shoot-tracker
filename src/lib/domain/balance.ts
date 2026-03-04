import type { TaskSerialStatus } from "@/lib/validations";

export interface TaskSerialCounts {
  /** Total serials on the task (unchanged by SOLD / NOT_FOUND / QC_FAIL). */
  requested: number;
  /** Serials still in REQUESTED status (pending pick / pending action). */
  pendingAction: number;
  packed: number;
  inTransit: number;
  received: number;
  sold: number;
  notFound: number;
  qcFail: number;
  returned: number;
  returnInTransit: number;
}

export function computeTaskSerialCounts(statusCounts: Map<TaskSerialStatus, number>): TaskSerialCounts {
  const total = [...statusCounts.values()].reduce((a, b) => a + b, 0);
  return {
    requested: total,
    pendingAction: statusCounts.get("REQUESTED") ?? 0,
    packed: (statusCounts.get("PACKED") ?? 0) + (statusCounts.get("PICKED") ?? 0),
    inTransit: statusCounts.get("IN_TRANSIT") ?? 0,
    received: (statusCounts.get("RECEIVED") ?? 0) + (statusCounts.get("RETURN_CREATED") ?? 0),
    sold: statusCounts.get("SOLD") ?? 0,
    notFound: statusCounts.get("NOT_FOUND") ?? 0,
    qcFail: statusCounts.get("QC_FAIL") ?? 0,
    returned: statusCounts.get("RETURNED") ?? 0,
    returnInTransit: (statusCounts.get("RETURN_IN_TRANSIT") ?? 0) + (statusCounts.get("BUFFERED") ?? 0),
  };
}

/**
 * Balance: every requested unit is in exactly one bucket.
 * R = P + IT + RECV + S + N + QC + RIT + RET
 */
export function isTaskBalanceSatisfied(counts: TaskSerialCounts): boolean {
  const { requested, packed, inTransit, received, sold, notFound, qcFail, returned, returnInTransit } = counts;
  const sum =
    packed + inTransit + received + sold + notFound + qcFail + returnInTransit + returned;
  return requested === sum;
}

export function getBalanceViolation(counts: TaskSerialCounts): string | null {
  const { requested, packed, inTransit, received, sold, notFound, qcFail, returned, returnInTransit } = counts;
  const sum =
    packed + inTransit + received + sold + notFound + qcFail + returnInTransit + returned;
  if (requested !== sum) {
    return `R (${requested}) ≠ P (${packed}) + IT (${inTransit}) + RECV (${received}) + S (${sold}) + N (${notFound}) + QC (${qcFail}) + RIT (${returnInTransit}) + RET (${returned})`;
  }
  return null;
}
