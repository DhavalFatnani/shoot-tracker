import { z } from "zod";

export const serialIdSchema = z.string().min(1).max(256);

export const importSerialRowSchema = z.object({
  serial_id: z.string().min(1).max(256),
  sku: z.string().min(1).max(128),
});

export const importSerialsBodySchema = z.object({
  serials: z.array(importSerialRowSchema).min(1),
  warehouseId: z.string().uuid(),
});

export type ImportSerialRow = z.infer<typeof importSerialRowSchema>;
export type ImportSerialsBody = z.infer<typeof importSerialsBodySchema>;
