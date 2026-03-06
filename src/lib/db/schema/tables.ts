import {
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  pgTable,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  locationEnum,
  taskStatusEnum,
  taskSerialStatusEnum,
  sessionTypeEnum,
  sessionStatusEnum,
  eventTypeEnum,
  disputeStatusEnum,
  roleEnum,
  teamTypeEnum,
  shootReasonEnum,
} from "./enums";

export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serialRegistry = pgTable("serial_registry", {
  serialId: varchar("serial_id", { length: 256 }).primaryKey(),
  sku: varchar("sku", { length: 128 }).notNull(),
  homeWarehouseId: uuid("home_warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  isActive: varchar("is_active", { length: 1 }).notNull().default("1"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  type: teamTypeEnum("type").notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: roleEnum("role").notNull(),
  firstName: varchar("first_name", { length: 128 }),
  lastName: varchar("last_name", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  serial: integer("serial").notNull().unique().default(sql`nextval('task_serial_seq')`),
  name: varchar("name", { length: 256 }),
  shootReason: shootReasonEnum("shoot_reason").notNull().default("INHOUSE_SHOOT"),
  shootTeamId: uuid("shoot_team_id")
    .notNull()
    .references(() => teams.id),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: taskStatusEnum("status").notNull().default("PICKING_PENDING"),
  dispatchTime: timestamp("dispatch_time", { withTimezone: true }),
  /** Locked at OPS dispatch: Received count (legacy; at dispatch received is 0) */
  dispatchReceived: integer("dispatch_received"),
  /** Locked at OPS dispatch: Sold count */
  dispatchSold: integer("dispatch_sold"),
  /** Locked at OPS dispatch: Not Found count */
  dispatchNotFound: integer("dispatch_not_found"),
  /** Locked at OPS dispatch: QC Fail count */
  dispatchQcFail: integer("dispatch_qc_fail"),
  /** Locked at OPS dispatch: Pending action (REQUESTED) count */
  dispatchPendingAction: integer("dispatch_pending_action"),
  /** Locked at OPS dispatch: Packed (PACKED + PICKED) count */
  dispatchPacked: integer("dispatch_packed"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  serial: integer("serial").notNull().unique().default(sql`nextval('return_serial_seq')`),
  name: varchar("name", { length: 256 }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  returnId: uuid("return_id").references(() => returns.id),
  type: sessionTypeEnum("type").notNull(),
  fromLocation: locationEnum("from_location").notNull(),
  toLocation: locationEnum("to_location").notNull(),
  status: sessionStatusEnum("status").notNull().default("OPEN"),
  startedBy: uuid("started_by").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  serialId: varchar("serial_id", { length: 256 }).notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  fromLocation: locationEnum("from_location").notNull(),
  toLocation: locationEnum("to_location").notNull(),
  taskId: uuid("task_id").references(() => tasks.id),
  sessionId: uuid("session_id").references(() => sessions.id),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serialCurrentState = pgTable("serial_current_state", {
  serialId: varchar("serial_id", { length: 256 }).primaryKey(),
  currentLocation: locationEnum("current_location").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    userId: uuid("user_id").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.teamId] })]
);

export const taskSerials = pgTable(
  "task_serials",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    serialId: varchar("serial_id", { length: 256 }).notNull(),
    status: taskSerialStatusEnum("status").notNull().default("REQUESTED"),
    returnable: varchar("returnable", { length: 1 }).notNull().default("1"),
    nonReturnReason: varchar("non_return_reason", { length: 512 }),
    orderId: varchar("order_id", { length: 256 }),
    qcFailReason: varchar("qc_fail_reason", { length: 512 }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.serialId] })]
);

export const sessionItems = pgTable(
  "session_items",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    serialId: varchar("serial_id", { length: 256 }).notNull(),
    scanStatus: varchar("scan_status", { length: 32 }).notNull(),
    errorReason: varchar("error_reason", { length: 512 }),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("session_items_session_id_serial_id").on(t.sessionId, t.serialId)]
);

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  serialId: varchar("serial_id", { length: 256 }).notNull(),
  disputeType: varchar("dispute_type", { length: 64 }).notNull(),
  description: varchar("description", { length: 1024 }),
  status: disputeStatusEnum("status").notNull().default("OPEN"),
  resolutionComment: varchar("resolution_comment", { length: 2048 }),
  resolutionPhotoUrl: varchar("resolution_photo_url", { length: 1024 }),
  resolvedBy: uuid("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  body: varchar("body", { length: 2048 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

