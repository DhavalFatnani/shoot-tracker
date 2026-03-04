/**
 * Parses inventory CSV in the format:
 * Clothing, Size, Bin Location, SKU Code
 * - Clothing: product URL
 * - Size: product size (S, M, etc.)
 * - Bin Location: "A32-S4-B1 • SN: 0000043569 • Store: 230" — serial number is extracted from "SN: ..."
 * - SKU Code: SKU (same for identical items; serial number is unique per item)
 *
 * Returns one row per line with serial_id (extracted from Bin Location) and sku (from SKU Code).
 * SKU <> Serial Number mapping is always preserved in input and outputs.
 */

export interface ParsedInventoryRow {
  serial_id: string;
  sku: string;
  size?: string;
  product_url?: string;
  bin_location?: string;
}

export interface ParseInventoryCsvResult {
  rows: ParsedInventoryRow[];
  errors: { line: number; message: string; raw?: string }[];
}

const SERIAL_NUMBER_PATTERN = /SN:\s*([^\s•]+)/i;

/**
 * Extract serial number from Bin Location string.
 * Example: "A32-S4-B1 • SN: 0000043569 • Store: 230" -> "0000043569"
 */
export function extractSerialFromBinLocation(binLocation: string): string | null {
  const trimmed = binLocation.trim();
  const match = trimmed.match(SERIAL_NUMBER_PATTERN);
  return match ? match[1].trim() : null;
}

/**
 * Parse a single line of CSV (handles quoted fields with commas).
 * Does not handle newlines inside quoted fields for simplicity.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += ch;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalize header: trim and case-insensitive match for known column names.
 */
function normalizeHeader(header: string): string {
  const h = header.trim().toLowerCase();
  if (h === "clothing") return "clothing";
  if (h === "size") return "size";
  if (h.includes("bin") && h.includes("location")) return "bin_location";
  if (h.includes("sku") && (h.includes("code") || h.includes("code"))) return "sku_code";
  return header.trim();
}

/**
 * Parse inventory CSV text. Expects header: Clothing, Size, Bin Location, SKU Code.
 * Returns parsed rows and per-line errors (e.g. missing serial or SKU).
 */
export function parseInventoryCsv(csvText: string): ParseInventoryCsvResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: ParsedInventoryRow[] = [];
  const errors: { line: number; message: string; raw?: string }[] = [];

  if (lines.length === 0) {
    return { rows: [], errors: [{ line: 0, message: "CSV is empty" }] };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(normalizeHeader);
  const clothingIdx = headers.findIndex((h) => h === "clothing");
  const sizeIdx = headers.findIndex((h) => h === "size");
  const binLocationIdx = headers.findIndex((h) => h === "bin_location");
  const skuCodeIdx = headers.findIndex((h) => h === "sku_code");

  if (binLocationIdx === -1) {
    const alt = headers.findIndex((h) => h.includes("bin") || h.includes("location"));
    if (alt === -1) {
      return {
        rows: [],
        errors: [{ line: 1, message: "Missing 'Bin Location' column. Expected: Clothing, Size, Bin Location, SKU Code", raw: headerLine }],
      };
    }
  }
  const binIdx = binLocationIdx >= 0 ? binLocationIdx : headers.findIndex((h) => h.includes("bin") || h.includes("location"));
  const skuIdx = skuCodeIdx >= 0 ? skuCodeIdx : headers.findIndex((h) => h.includes("sku"));
  if (skuIdx === -1) {
    return {
      rows: [],
      errors: [{ line: 1, message: "Missing 'SKU Code' column", raw: headerLine }],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields = parseCsvLine(line);
    const binLocation = fields[binIdx] ?? "";
    const sku = (fields[skuIdx] ?? "").trim();
    const serial_id = extractSerialFromBinLocation(binLocation);

    if (!serial_id) {
      errors.push({ line: i + 1, message: "Could not extract serial number from Bin Location (expect 'SN: ...')", raw: line });
      continue;
    }
    if (!sku) {
      errors.push({ line: i + 1, message: "SKU Code is empty", raw: line });
      continue;
    }

    result.push({
      serial_id,
      sku,
      size: sizeIdx >= 0 ? (fields[sizeIdx] ?? "").trim() || undefined : undefined,
      product_url: clothingIdx >= 0 ? (fields[clothingIdx] ?? "").trim() || undefined : undefined,
      bin_location: binLocation || undefined,
    });
  }

  return { rows: result, errors };
}
