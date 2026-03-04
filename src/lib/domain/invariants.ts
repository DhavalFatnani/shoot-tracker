import type { Location } from "@/lib/validations";

const ELIGIBLE_FOR_REQUEST: Location[] = ["WH_", "SHOOT_BUFFER"];
const TERMINAL_LOCATIONS: Location[] = ["SOLD", "LOST"];

/**
 * Serial is eligible to be added to a new request if:
 * - Not in a terminal state (SOLD, LOST)
 * - Current location is WH_ or SHOOT_BUFFER
 */
export function canAddSerialToRequest(currentLocation: Location | null): boolean {
  if (currentLocation == null) return false;
  if (TERMINAL_LOCATIONS.includes(currentLocation)) return false;
  return ELIGIBLE_FOR_REQUEST.includes(currentLocation);
}

/**
 * Serial must not be in another OPEN session when adding to a session or committing.
 */
export function canSerialBeInSession(
  isInAnotherOpenSession: boolean
): boolean {
  return !isInAnotherOpenSession;
}

/**
 * Serial must exist in registry and be active for request/session operations.
 */
export function isSerialEligible(
  existsInRegistry: boolean,
  isActive: boolean,
  currentLocation: Location | null
): boolean {
  if (!existsInRegistry || !isActive) return false;
  return canAddSerialToRequest(currentLocation) || currentLocation === "TRANSIT" || currentLocation === "SHOOT_ACTIVE";
}
