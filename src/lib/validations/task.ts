import { z } from "zod";
import { serialIdSchema } from "./serial";

export const shootReasonSchema = z.enum(["INHOUSE_SHOOT", "AGENCY_SHOOT", "INFLUENCER_FITS"]);

export const createRequestSchema = z.object({
  serialIds: z.array(serialIdSchema).min(1),
  serials: z.array(z.object({ serial_id: z.string(), sku: z.string() })).optional(),
  shootReason: shootReasonSchema.default("INHOUSE_SHOOT"),
  nonReturnSerials: z.array(z.object({
    serial_id: z.string(),
    reason: z.string().min(1),
  })).optional(),
  warehouseId: z.string().uuid(),
  shootTeamId: z.string().uuid(),
});

export const closeTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export const getTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export const listTasksSchema = z.object({
  status: z.enum(["OPEN", "PICKING_PENDING", "PICKING", "IN_TRANSIT", "ACTIVE", "RETURN_PENDING", "COLLECTED", "RECEIVING", "RETURNING", "VERIFYING", "CLOSED"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  q: z.string().min(1).max(256).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type CloseTaskInput = z.infer<typeof closeTaskSchema>;
export type GetTaskInput = z.infer<typeof getTaskSchema>;
export type ListTasksInput = z.infer<typeof listTasksSchema>;
