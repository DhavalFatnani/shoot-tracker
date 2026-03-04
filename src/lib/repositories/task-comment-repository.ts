import { eq, desc } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { taskComments, profiles } from "@/lib/db/schema";

export async function listByTaskId(db: Database | Tx, taskId: string) {
  const rows = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      userId: taskComments.userId,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      userRole: profiles.role,
    })
    .from(taskComments)
    .leftJoin(profiles, eq(taskComments.userId, profiles.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));

  return rows;
}

export async function insert(
  db: Database | Tx,
  data: { taskId: string; userId: string; body: string }
) {
  const [row] = await db
    .insert(taskComments)
    .values(data)
    .returning({ id: taskComments.id });
  return row!.id;
}
