import { describe, it, expect } from "vitest";
import {
  computeTaskSerialCounts,
  isTaskBalanceSatisfied,
  getBalanceViolation,
} from "@/lib/domain/balance";
import type { TaskSerialStatus } from "@/lib/validations";

describe("Task balance", () => {
  it("computes counts from status map", () => {
    const map = new Map<TaskSerialStatus, number>([
      ["REQUESTED", 0],
      ["DISPATCHED", 5],
      ["SOLD", 1],
      ["NOT_FOUND", 2],
      ["RETURNED", 3],
      ["BUFFERED", 2],
    ]);
    const counts = computeTaskSerialCounts(map);
    expect(counts.requested).toBe(0);
    expect(counts.dispatched).toBe(5);
    expect(counts.sold).toBe(1);
    expect(counts.notFound).toBe(2);
    expect(counts.returned).toBe(3);
    expect(counts.buffered).toBe(2);
  });

  it("satisfied when R = D + S + N and D = RET + B", () => {
    const counts = {
      requested: 10,
      dispatched: 6,
      sold: 1,
      notFound: 3,
      returned: 4,
      buffered: 2,
    };
    expect(isTaskBalanceSatisfied(counts)).toBe(true);
    expect(getBalanceViolation(counts)).toBeNull();
  });

  it("not satisfied when R != D + S + N", () => {
    const counts = {
      requested: 10,
      dispatched: 5,
      sold: 1,
      notFound: 3,
      returned: 4,
      buffered: 1,
    };
    expect(isTaskBalanceSatisfied(counts)).toBe(false);
    const msg = getBalanceViolation(counts);
    expect(msg).toContain("R");
    expect(msg).toContain("D");
  });

  it("not satisfied when D != RET + B", () => {
    const counts = {
      requested: 10,
      dispatched: 6,
      sold: 1,
      notFound: 3,
      returned: 3,
      buffered: 2,
    };
    expect(isTaskBalanceSatisfied(counts)).toBe(false);
    const msg = getBalanceViolation(counts);
    expect(msg).toContain("D");
    expect(msg).toContain("RET");
  });
});
