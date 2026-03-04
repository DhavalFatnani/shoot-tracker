import { describe, it, expect } from "vitest";
import { canAddSerialToRequest, canSerialBeInSession } from "@/lib/domain/invariants";

describe("Invariants", () => {
  it("canAddSerialToRequest: WH_ and SHOOT_BUFFER are eligible", () => {
    expect(canAddSerialToRequest("WH_")).toBe(true);
    expect(canAddSerialToRequest("SHOOT_BUFFER")).toBe(true);
  });

  it("canAddSerialToRequest: SOLD and LOST are not eligible", () => {
    expect(canAddSerialToRequest("SOLD")).toBe(false);
    expect(canAddSerialToRequest("LOST")).toBe(false);
  });

  it("canAddSerialToRequest: TRANSIT and SHOOT_ACTIVE are not eligible for new request", () => {
    expect(canAddSerialToRequest("TRANSIT")).toBe(false);
    expect(canAddSerialToRequest("SHOOT_ACTIVE")).toBe(false);
  });

  it("canAddSerialToRequest: null is not eligible", () => {
    expect(canAddSerialToRequest(null)).toBe(false);
  });

  it("canSerialBeInSession: false when in another open session", () => {
    expect(canSerialBeInSession(true)).toBe(false);
  });

  it("canSerialBeInSession: true when not in another open session", () => {
    expect(canSerialBeInSession(false)).toBe(true);
  });
});
