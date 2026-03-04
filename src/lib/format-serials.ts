/**
 * Display serial codes for tasks and returns (shown instead of UUIDs in the UI).
 */

export function formatTaskSerial(serial: number): string {
  return `T-${String(serial).padStart(4, "0")}`;
}

export function formatReturnSerial(serial: number): string {
  return `R-${String(serial).padStart(4, "0")}`;
}
