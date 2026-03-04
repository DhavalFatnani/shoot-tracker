import { describe, it, expect } from "vitest";
import { parseInventoryCsv, extractSerialFromBinLocation } from "@/lib/csv";

describe("extractSerialFromBinLocation", () => {
  it("extracts serial from Bin Location with SN: pattern", () => {
    expect(extractSerialFromBinLocation("A32-S4-B1 • SN: 0000043569 • Store: 230")).toBe("0000043569");
    expect(extractSerialFromBinLocation("A30-S4-B17 • SN: 0000056027 • Store: 230")).toBe("0000056027");
    expect(extractSerialFromBinLocation("A39-S3-B2 • SN: 0000011062 • Store: 230")).toBe("0000011062");
  });

  it("returns null when no SN: pattern", () => {
    expect(extractSerialFromBinLocation("A32-S4-B1")).toBeNull();
    expect(extractSerialFromBinLocation("")).toBeNull();
  });
});

describe("parseInventoryCsv", () => {
  it("parses sample CSV with header Clothing, Size, Bin Location, SKU Code", () => {
    const csv = `Clothing,Size,Bin Location ,SKU Code
https://knotnow.co/product/888?size_id=ld_3380859,S,A32-S4-B1 • SN: 0000043569 • Store: 230,CP0018_S
https://knotnow.co/product/874?size_id=ld_3489529,M,A30-S4-B17 • SN: 0000056027 • Store: 230,W1-NISH-WHT-M-879
https://knotnow.co/product/14261?size_id=ld_4280724,S,A39-S3-B2 • SN: 0000011062 • Store: 230,TB2833-S`;
    const result = parseInventoryCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual({ serial_id: "0000043569", sku: "CP0018_S", size: "S", product_url: "https://knotnow.co/product/888?size_id=ld_3380859", bin_location: "A32-S4-B1 • SN: 0000043569 • Store: 230" });
    expect(result.rows[1].serial_id).toBe("0000056027");
    expect(result.rows[1].sku).toBe("W1-NISH-WHT-M-879");
    expect(result.rows[2].serial_id).toBe("0000011062");
    expect(result.rows[2].sku).toBe("TB2833-S");
  });

  it("reports error when Bin Location has no SN:", () => {
    const csv = `Clothing,Size,Bin Location,SKU Code
https://example.com,S,NoSerialHere,CP0018_S`;
    const result = parseInventoryCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("serial");
  });

  it("reports error when SKU Code is empty", () => {
    const csv = `Clothing,Size,Bin Location,SKU Code
https://example.com,S,A32-S4-B1 • SN: 0000043569 • Store: 230,`;
    const result = parseInventoryCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.message.includes("SKU"))).toBe(true);
  });

  it("returns empty when CSV is empty", () => {
    const result = parseInventoryCsv("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
