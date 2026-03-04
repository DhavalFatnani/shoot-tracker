export const LOCATION = {
  WH_: "WH_",
  TRANSIT: "TRANSIT",
  SHOOT_ACTIVE: "SHOOT_ACTIVE",
  SHOOT_BUFFER: "SHOOT_BUFFER",
  SOLD: "SOLD",
  LOST: "LOST",
  QC_FAIL: "QC_FAIL",
} as const;

export type Location = (typeof LOCATION)[keyof typeof LOCATION];

export const TASK_STATUS = {
  OPEN: "OPEN",
  PICKING_PENDING: "PICKING_PENDING",
  PICKING: "PICKING",
  IN_TRANSIT: "IN_TRANSIT",
  ACTIVE: "ACTIVE",
  RETURN_PENDING: "RETURN_PENDING",
  COLLECTED: "COLLECTED",
  RECEIVING: "RECEIVING",
  RETURNING: "RETURNING",
  VERIFYING: "VERIFYING",
  CLOSED: "CLOSED",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_SERIAL_STATUS = {
  REQUESTED: "REQUESTED",
  PICKED: "PICKED",
  PACKED: "PACKED",
  DISPATCHED: "DISPATCHED",
  IN_TRANSIT: "IN_TRANSIT",
  RECEIVED: "RECEIVED",
  SOLD: "SOLD",
  NOT_FOUND: "NOT_FOUND",
  QC_FAIL: "QC_FAIL",
  RETURNED: "RETURNED",
  BUFFERED: "BUFFERED",
  RETURN_CREATED: "RETURN_CREATED",
  RETURN_IN_TRANSIT: "RETURN_IN_TRANSIT",
} as const;

export type TaskSerialStatus = (typeof TASK_SERIAL_STATUS)[keyof typeof TASK_SERIAL_STATUS];

export const SESSION_TYPE = {
  PICK: "PICK",
  RECEIPT: "RECEIPT",
  RETURN_SCAN: "RETURN_SCAN",
  RETURN_VERIFY: "RETURN_VERIFY",
} as const;

export type SessionType = (typeof SESSION_TYPE)[keyof typeof SESSION_TYPE];

export const SESSION_STATUS = {
  OPEN: "OPEN",
  COMMITTED: "COMMITTED",
  CANCELLED: "CANCELLED",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export const EVENT_TYPE = {
  PICK: "PICK",
  RECEIPT: "RECEIPT",
  RETURN_TO_WH: "RETURN_TO_WH",
  RETURN_TO_BUFFER: "RETURN_TO_BUFFER",
  MARK_SOLD: "MARK_SOLD",
  MARK_LOST: "MARK_LOST",
  REQUEST: "REQUEST",
  ADMIN_REVERT: "ADMIN_REVERT",
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

export const ROLE = {
  ADMIN: "ADMIN",
  SHOOT_USER: "SHOOT_USER",
  OPS_USER: "OPS_USER",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const TEAM_TYPE = {
  SHOOT: "SHOOT",
  OPS: "OPS",
} as const;

export type TeamType = (typeof TEAM_TYPE)[keyof typeof TEAM_TYPE];

export const SHOOT_REASON = {
  INHOUSE_SHOOT: "INHOUSE_SHOOT",
  AGENCY_SHOOT: "AGENCY_SHOOT",
  INFLUENCER_FITS: "INFLUENCER_FITS",
} as const;

export type ShootReason = (typeof SHOOT_REASON)[keyof typeof SHOOT_REASON];

export const SHOOT_REASON_LABELS: Record<ShootReason, string> = {
  INHOUSE_SHOOT: "Inhouse Shoot",
  AGENCY_SHOOT: "Agency Shoot",
  INFLUENCER_FITS: "Influencer Fits",
};
