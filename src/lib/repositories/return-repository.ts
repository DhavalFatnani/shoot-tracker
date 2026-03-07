import { eq, desc, and, or, inArray, isNotNull, sql } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { returns, sessions, sessionItems, tasks, serialRegistry, taskSerials, profiles } from "@/lib/db/schema";
import { formatDisplayName } from "./profile-repository";

export async function returnById(db: Database, returnId: string) {
  const rows = await db.select().from(returns).where(eq(returns.id, returnId)).limit(1);
  return rows[0] ?? null;
}

/** Return ID for a task that is part of a return (from any session with return_id). */
export async function returnIdByTaskId(db: Database | Tx, taskId: string): Promise<string | null> {
  const rows = await db
    .select({ returnId: sessions.returnId })
    .from(sessions)
    .where(and(eq(sessions.taskId, taskId), isNotNull(sessions.returnId)))
    .limit(1);
  const id = rows[0]?.returnId ?? null;
  return id;
}

export type ListReturnsOptions = {
  /** Filter by creator (SHOOT_USER sees own) */
  createdBy?: string;
  /** Include returns whose tasks belong to these shoot team IDs (so team sees admin-created returns) */
  shootTeamIds?: string[];
  limit: number;
  offset: number;
};

export async function listReturns(db: Database, options: ListReturnsOptions) {
  const { createdBy, shootTeamIds, limit, offset } = options;

  const hasCreator = createdBy !== undefined;
  const hasTeam = shootTeamIds !== undefined && shootTeamIds.length > 0;

  let returnIds: string[] = [];
  if (hasCreator && hasTeam) {
    const [byCreator, byTeam] = await Promise.all([
      db.select({ id: returns.id }).from(returns).where(eq(returns.createdBy, createdBy!)),
      db
        .selectDistinct({ returnId: sessions.returnId })
        .from(sessions)
        .innerJoin(tasks, eq(sessions.taskId, tasks.id))
        .where(and(isNotNull(sessions.returnId), inArray(tasks.shootTeamId, shootTeamIds))),
    ]);
    returnIds = [
      ...byCreator.map((r) => r.id),
      ...byTeam.map((r) => r.returnId).filter((id): id is string => id != null),
    ];
  } else if (hasCreator) {
    const byCreator = await db
      .select({ id: returns.id })
      .from(returns)
      .where(eq(returns.createdBy, createdBy));
    returnIds = byCreator.map((r) => r.id);
  } else if (hasTeam) {
    const byTeam = await db
      .selectDistinct({ returnId: sessions.returnId })
      .from(sessions)
      .innerJoin(tasks, eq(sessions.taskId, tasks.id))
      .where(and(isNotNull(sessions.returnId), inArray(tasks.shootTeamId, shootTeamIds)));
    returnIds = byTeam.map((r) => r.returnId).filter((id): id is string => id != null);
  }

  if (returnIds.length === 0 && (hasCreator || hasTeam)) {
    return [];
  }

  const uniqueIds = [...new Set(returnIds)];

  if (uniqueIds.length === 0) {
    return db.select().from(returns).orderBy(desc(returns.createdAt)).limit(limit).offset(offset);
  }

  return db
    .select()
    .from(returns)
    .where(inArray(returns.id, uniqueIds))
    .orderBy(desc(returns.createdAt))
    .limit(limit)
    .offset(offset);
}

export type ReturnListRow = {
  id: string;
  serial: number;
  name: string | null;
  createdBy: string;
  createdAt: Date;
  closedAt: Date | null;
  dispatchedAt: Date | null;
  totalSerials: number;
  taskCount: number;
  /** Number of serials in this return with task_serial status RETURNED (verified) */
  verifiedCount: number;
};

export async function listReturnsWithSummary(db: Database, options: ListReturnsOptions): Promise<ReturnListRow[]> {
  const rows = await listReturns(db, options);
  if (rows.length === 0) return [];

  const returnIds = rows.map((r) => r.id);
  const sessionRows = await db
    .select({ id: sessions.id, returnId: sessions.returnId, taskId: sessions.taskId })
    .from(sessions)
    .where(inArray(sessions.returnId, returnIds));

  const sessionIds = sessionRows.map((s) => s.id);
  const returnIdBySession = new Map(sessionRows.map((s) => [s.id, s.returnId!]));
  const taskIdBySession = new Map(sessionRows.map((s) => [s.id, s.taskId]));

  if (sessionIds.length === 0) {
    return rows.map((r) => ({
      id: r.id,
      serial: r.serial,
      name: r.name,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      closedAt: r.closedAt ?? null,
      dispatchedAt: r.dispatchedAt ?? null,
      totalSerials: 0,
      taskCount: 0,
      verifiedCount: 0,
    }));
  }

  const itemRows = await db
    .select({ sessionId: sessionItems.sessionId, serialId: sessionItems.serialId })
    .from(sessionItems)
    .where(inArray(sessionItems.sessionId, sessionIds));

  const countBySession = new Map<string, number>();
  const pairsByReturn = new Map<string, { taskId: string; serialId: string }[]>();
  for (const row of itemRows) {
    countBySession.set(row.sessionId, (countBySession.get(row.sessionId) ?? 0) + 1);
    const rid = returnIdBySession.get(row.sessionId);
    const taskId = taskIdBySession.get(row.sessionId);
    if (rid && taskId) {
      const list = pairsByReturn.get(rid) ?? [];
      list.push({ taskId, serialId: row.serialId });
      pairsByReturn.set(rid, list);
    }
  }

  const taskCountByReturn = new Map<string, number>();
  const totalSerialsByReturn = new Map<string, number>();
  for (const sid of sessionIds) {
    const rid = returnIdBySession.get(sid)!;
    taskCountByReturn.set(rid, (taskCountByReturn.get(rid) ?? 0) + 1);
    totalSerialsByReturn.set(rid, (totalSerialsByReturn.get(rid) ?? 0) + (countBySession.get(sid) ?? 0));
  }

  const verifiedCountByReturn = new Map<string, number>();
  const allPairs = Array.from(pairsByReturn.entries()).flatMap(([returnId, pairs]) =>
    pairs.map((p) => ({ returnId, taskId: p.taskId, serialId: p.serialId }))
  );
  if (allPairs.length > 0) {
    const returned = await db
      .select({ taskId: taskSerials.taskId, serialId: taskSerials.serialId })
      .from(taskSerials)
      .where(
        and(
          eq(taskSerials.status, "RETURNED"),
          sql`(${taskSerials.taskId}, ${taskSerials.serialId}) IN (${sql.join(
            allPairs.map((p) => sql`(${p.taskId}, ${p.serialId})`),
            sql`, `
          )})`
        )
      );
    const returnedSet = new Set(returned.map((r) => `${r.taskId}:${r.serialId}`));
    for (const [returnId, pairs] of pairsByReturn) {
      const count = pairs.filter((p) => returnedSet.has(`${p.taskId}:${p.serialId}`)).length;
      verifiedCountByReturn.set(returnId, count);
    }
  }

  return rows.map((r) => {
    const totalSerials = totalSerialsByReturn.get(r.id) ?? 0;
    const verifiedCount = verifiedCountByReturn.get(r.id) ?? 0;
    return {
      id: r.id,
      serial: r.serial,
      name: r.name,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      closedAt: r.closedAt ?? null,
      dispatchedAt: r.dispatchedAt ?? null,
      totalSerials,
      taskCount: taskCountByReturn.get(r.id) ?? 0,
      verifiedCount,
    };
  });
}

export type ReturnSessionRow = {
  sessionId: string;
  taskId: string;
  taskSerial: number;
  taskName: string | null;
  serialCount: number;
  sessionType: string;
  startedBy: string;
  startedAt: Date;
  committedAt: Date | null;
  startedByName?: string | null;
};

export type ReturnWithSessions = {
  id: string;
  serial: number;
  name: string | null;
  createdBy: string;
  createdByName?: string | null;
  createdAt: Date;
  dispatchedAt: Date | null;
  closedAt: Date | null;
  sessions: ReturnSessionRow[];
  totalSerials: number;
  verifiedCount: number;
  serials: { serialId: string; sku: string | null; taskId: string; taskName: string | null; returnable: string; nonReturnReason: string | null }[];
  involvedShootTeamIds: string[];
};

export async function getReturnWithSessions(db: Database, returnId: string): Promise<ReturnWithSessions | null> {
  const r = await returnById(db, returnId);
  if (!r) return null;

  const creatorRows = await db
    .select({ firstName: profiles.firstName, lastName: profiles.lastName })
    .from(profiles)
    .where(eq(profiles.id, r.createdBy))
    .limit(1);
  const createdByName = creatorRows[0] ? formatDisplayName(creatorRows[0].firstName, creatorRows[0].lastName) : null;

  const sessionRows = await db
    .select({
      sessionId: sessions.id,
      taskId: sessions.taskId,
      taskSerial: tasks.serial,
      taskName: tasks.name,
      shootTeamId: tasks.shootTeamId,
      sessionType: sessions.type,
      startedBy: sessions.startedBy,
      startedAt: sessions.startedAt,
      committedAt: sessions.committedAt,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(sessions)
    .innerJoin(tasks, eq(sessions.taskId, tasks.id))
    .leftJoin(profiles, eq(sessions.startedBy, profiles.id))
    .where(eq(sessions.returnId, returnId));

  const sessionIds = sessionRows.map((s) => s.sessionId);
  const involvedShootTeamIds = [...new Set(sessionRows.map((s) => s.shootTeamId).filter(Boolean))];

  if (sessionIds.length === 0) {
    return {
      id: r.id,
      serial: r.serial,
      name: r.name,
      createdBy: r.createdBy,
      createdByName,
      createdAt: r.createdAt,
      dispatchedAt: r.dispatchedAt ?? null,
      closedAt: r.closedAt ?? null,
      sessions: [],
      totalSerials: 0,
      verifiedCount: 0,
      serials: [],
      involvedShootTeamIds: [],
    };
  }

  const itemRows = await db
    .select({ sessionId: sessionItems.sessionId, serialId: sessionItems.serialId })
    .from(sessionItems)
    .where(inArray(sessionItems.sessionId, sessionIds));

  const countBySession = new Map<string, number>();
  const serialIds = new Set<string>();
  for (const row of itemRows) {
    countBySession.set(row.sessionId, (countBySession.get(row.sessionId) ?? 0) + 1);
    serialIds.add(row.serialId);
  }

  const sessionsList: ReturnSessionRow[] = sessionRows.map((s) => ({
    sessionId: s.sessionId,
    taskId: s.taskId,
    taskSerial: s.taskSerial,
    taskName: s.taskName,
    serialCount: countBySession.get(s.sessionId) ?? 0,
    sessionType: s.sessionType,
    startedBy: s.startedBy,
    startedAt: s.startedAt,
    committedAt: s.committedAt,
    startedByName: formatDisplayName(s.firstName, s.lastName),
  }));

  const totalSerials = sessionsList.reduce((n, s) => n + s.serialCount, 0);

  const taskIdBySession = new Map(sessionRows.map((s) => [s.sessionId, s.taskId]));
  const taskNameByTaskId = new Map(sessionRows.map((s) => [s.taskId, s.taskName]));
  const pairs = itemRows
    .map((i) => ({ taskId: taskIdBySession.get(i.sessionId), serialId: i.serialId }))
    .filter((p): p is { taskId: string; serialId: string } => p.taskId != null);

  let verifiedCount = 0;
  let serialsWithMeta: { serialId: string; sku: string | null; taskId: string; taskName: string | null; returnable: string; nonReturnReason: string | null }[] = itemRows.map((row) => {
    const taskId = taskIdBySession.get(row.sessionId)!;
    return { serialId: row.serialId, sku: null as string | null, taskId, taskName: taskNameByTaskId.get(taskId) ?? null, returnable: "1", nonReturnReason: null as string | null };
  });
  if (pairs.length > 0) {
    const conditions = pairs.map((p) =>
      and(
        eq(taskSerials.taskId, p.taskId),
        eq(taskSerials.serialId, p.serialId),
        eq(taskSerials.status, "RETURNED")
      )
    );
    const returned = await db
      .select({ taskId: taskSerials.taskId, serialId: taskSerials.serialId })
      .from(taskSerials)
      .where(or(...conditions));
    verifiedCount = returned.length;
    const tsRows = await db
      .select({ taskId: taskSerials.taskId, serialId: taskSerials.serialId, returnable: taskSerials.returnable, nonReturnReason: taskSerials.nonReturnReason })
      .from(taskSerials)
      .where(or(...pairs.map((p) => and(eq(taskSerials.taskId, p.taskId), eq(taskSerials.serialId, p.serialId)))));
    const metaByKey = new Map(tsRows.map((r) => [`${r.taskId}:${r.serialId}`, r]));
    serialsWithMeta = itemRows.map((row) => {
      const taskId = taskIdBySession.get(row.sessionId)!;
      const meta = metaByKey.get(`${taskId}:${row.serialId}`);
      return {
        serialId: row.serialId,
        sku: null as string | null,
        taskId,
        taskName: taskNameByTaskId.get(taskId) ?? null,
        returnable: meta?.returnable ?? "1",
        nonReturnReason: meta?.nonReturnReason ?? null,
      };
    });
  }
  if (serialIds.size > 0) {
    const regRows = await db
      .select({ serialId: serialRegistry.serialId, sku: serialRegistry.sku })
      .from(serialRegistry)
      .where(inArray(serialRegistry.serialId, [...serialIds]));
    const skuBySerial = new Map(regRows.map((x) => [x.serialId, x.sku]));
    serialsWithMeta = serialsWithMeta.map((row) => ({ ...row, sku: skuBySerial.get(row.serialId) ?? null }));
  }

  const deduped = new Map<string, typeof serialsWithMeta[number]>();
  for (const s of serialsWithMeta) {
    const key = `${s.serialId}-${s.taskId}`;
    if (!deduped.has(key)) deduped.set(key, s);
  }
  const uniqueSerials = Array.from(deduped.values());

  return {
    id: r.id,
    serial: r.serial,
    name: r.name,
    createdBy: r.createdBy,
    createdByName,
    createdAt: r.createdAt,
    dispatchedAt: r.dispatchedAt ?? null,
    closedAt: r.closedAt ?? null,
    sessions: sessionsList,
    totalSerials: uniqueSerials.length,
    verifiedCount,
    serials: uniqueSerials,
    involvedShootTeamIds,
  };
}
