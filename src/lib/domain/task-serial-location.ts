import type { TaskSerialStatus, Location } from "@/lib/validations";

/**
 * When task_serial status changes to one of these values, serial_current_state.currentLocation
 * should be updated to keep both in sync. Statuses not in this map (e.g. PACKED, PICKED) do not
 * imply a location change by themselves.
 */
const TASK_SERIAL_STATUS_TO_LOCATION: Partial<Record<TaskSerialStatus, Location>> = {
  IN_TRANSIT: "TRANSIT",
  RECEIVED: "SHOOT_ACTIVE",
  /** Return created by shoot; serials still at shoot until return dispatch. */
  RETURN_CREATED: "SHOOT_ACTIVE",
  /** Items being returned: in transit back to warehouse. */
  RETURN_IN_TRANSIT: "TRANSIT",
  RETURNED: "WH_",
  SOLD: "SOLD",
  NOT_FOUND: "LOST",
  QC_FAIL: "QC_FAIL",
  REQUESTED: "WH_",
};

/**
 * Returns the location that serial_current_state should be set to when a task_serial's status
 * is updated to the given status. Returns null if the status does not imply a location update
 * (e.g. PACKED, PICKED).
 */
export function getLocationForTaskSerialStatus(status: TaskSerialStatus): Location | null {
  return TASK_SERIAL_STATUS_TO_LOCATION[status] ?? null;
}
