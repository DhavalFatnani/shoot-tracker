import { z } from "zod";
import { serialIdSchema } from "./serial";

export const startSessionSchema = z.object({
  taskId: z.string().uuid(),
  type: z.enum(["PICK", "RECEIPT", "RETURN_SCAN", "RETURN_VERIFY"]),
});

export const addScanSchema = z.object({
  sessionId: z.string().uuid(),
  serialId: serialIdSchema,
});

export const commitSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const cancelSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type AddScanInput = z.infer<typeof addScanSchema>;
export type CommitSessionInput = z.infer<typeof commitSessionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
