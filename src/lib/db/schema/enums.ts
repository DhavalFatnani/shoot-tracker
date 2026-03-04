import { pgEnum } from "drizzle-orm/pg-core";

export const locationEnum = pgEnum("location_enum", [
  "WH_",
  "TRANSIT",
  "SHOOT_ACTIVE",
  "SHOOT_BUFFER",
  "SOLD",
  "LOST",
  "QC_FAIL",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "OPEN",
  "PICKING_PENDING",
  "PICKING",
  "IN_TRANSIT",
  "ACTIVE",
  "RETURN_PENDING",
  "COLLECTED",
  "RECEIVING",
  "RETURNING",
  "VERIFYING",
  "CLOSED",
]);

export const taskSerialStatusEnum = pgEnum("task_serial_status", [
  "REQUESTED",
  "PICKED",
  "PACKED",
  "DISPATCHED",
  "IN_TRANSIT",
  "RECEIVED",
  "SOLD",
  "NOT_FOUND",
  "QC_FAIL",
  "RETURNED",
  "BUFFERED",
  "RETURN_CREATED",
  "RETURN_IN_TRANSIT",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "PICK",
  "RECEIPT",
  "RETURN_SCAN",
  "RETURN_VERIFY",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "OPEN",
  "COMMITTED",
  "CANCELLED",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "PICK",
  "RECEIPT",
  "RETURN_TO_WH",
  "RETURN_TO_BUFFER",
  "MARK_SOLD",
  "MARK_LOST",
  "REQUEST",
  "ADMIN_REVERT",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "OPEN",
  "RESOLVED",
]);

export const roleEnum = pgEnum("role_enum", [
  "ADMIN",
  "SHOOT_USER",
  "OPS_USER",
]);

export const teamTypeEnum = pgEnum("team_type", ["SHOOT", "OPS"]);

export const shootReasonEnum = pgEnum("shoot_reason", [
  "INHOUSE_SHOOT",
  "AGENCY_SHOOT",
  "INFLUENCER_FITS",
]);
