import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentPoints } from "@/lib/db/schema";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export type PointAction = "onboard" | "outreach" | "retention";

const DEFAULTS: Record<PointAction, number> = {
  onboard: 10,
  outreach: 2,
  retention: 25,
};

export function getPointValues(): Record<PointAction, number> {
  const num = (key: string, d: number) => {
    const v = Number(getSetting(key));
    return Number.isFinite(v) && v >= 0 ? v : d;
  };
  return {
    onboard: num(SETTING_KEYS.pointsOnboard, DEFAULTS.onboard),
    outreach: num(SETTING_KEYS.pointsOutreach, DEFAULTS.outreach),
    retention: num(SETTING_KEYS.pointsRetention, DEFAULTS.retention),
  };
}

/** Awards points to an agent for an action. No-op if value is 0. */
export function awardPoints(
  agentUserId: number,
  action: PointAction,
  opts: { clientId?: number | null; note?: string } = {},
): void {
  const points = getPointValues()[action];
  if (!points) return;
  db.insert(agentPoints)
    .values({
      agentUserId,
      action,
      points,
      clientId: opts.clientId ?? null,
      note: opts.note ?? null,
      createdAt: new Date().toISOString(),
    })
    .run();
}

/** True if this agent already earned outreach points for this client today. */
export function outreachAwardedToday(
  agentUserId: number,
  clientId: number,
): boolean {
  const todayPrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(agentPoints)
    .where(
      and(
        eq(agentPoints.agentUserId, agentUserId),
        eq(agentPoints.action, "outreach"),
        eq(agentPoints.clientId, clientId),
        sql`${agentPoints.createdAt} >= ${todayPrefix}`,
      ),
    )
    .get();
  return (row?.n ?? 0) > 0;
}
