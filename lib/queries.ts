import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activityLog,
  admin,
  agentPoints,
  clients,
  orders,
  providers,
} from "@/lib/db/schema";
import { clientFor } from "@/lib/providers";
import { getNotifyDays } from "@/lib/settings";

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export type ClientStatus =
  | "active"
  | "expired"
  | "disabled"
  | "pending"
  | "unknown";

export function effectiveStatus(
  status: string,
  expireDate: string | null,
): ClientStatus {
  if (status === "pending") return "pending"; // awaiting line setup
  if (status === "disabled") return "disabled";
  const d = daysUntil(expireDate);
  if (d != null) return d < 0 ? "expired" : "active";
  return (status as ClientStatus) ?? "unknown";
}

export type ProviderCredit = {
  id: number;
  name: string;
  ok: boolean;
  credits: number | null;
  username?: string;
  error?: string;
};

/** Live credit balances for all enabled providers (parallel API calls). */
export async function getProviderCredits(): Promise<ProviderCredit[]> {
  const rows = db.select().from(providers).all();
  return Promise.all(
    rows.map(async (p): Promise<ProviderCredit> => {
      if (!p.enabled) {
        return { id: p.id, name: p.name, ok: false, credits: null, error: "disabled" };
      }
      try {
        const info = await clientFor(p).getResellerInfo();
        return {
          id: p.id,
          name: p.name,
          ok: true,
          credits: info.credits,
          username: info.username,
        };
      } catch (e) {
        return {
          id: p.id,
          name: p.name,
          ok: false,
          credits: null,
          error: e instanceof Error ? e.message : "unreachable",
        };
      }
    }),
  );
}

export function getClientStats() {
  const rows = db.select().from(clients).all();
  const stats = {
    total: rows.length,
    active: 0,
    expired: 0,
    disabled: 0,
    pending: 0,
    unknown: 0,
  };
  for (const r of rows) {
    stats[effectiveStatus(r.status, r.expireDate)]++;
  }
  return stats;
}

export function getExpiringSoon(withinDays = 7) {
  const rows = db.select().from(clients).all();
  return rows
    .map((r) => ({ ...r, days: daysUntil(r.expireDate) }))
    .filter((r) => r.days != null && r.days >= 0 && r.days <= withinDays)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
}

/** Days-left threshold for the "expiring soon" notifications (Settings, then env). */
export function notifyThresholdDays(): number {
  return getNotifyDays();
}

export type ExpiringNotification = {
  id: number;
  label: string; // username or mac
  providerName: string;
  expireDate: string | null;
  days: number; // can be negative if already expired
  expired: boolean;
};

/**
 * Clients at or under the notification threshold (default 2 days), including
 * already-expired lines. Shared by the in-app bell and the Telegram cron job.
 */
export function getExpiringNotifications(
  withinDays = notifyThresholdDays(),
): ExpiringNotification[] {
  const provs = db.select().from(providers).all();
  const provMap = new Map(provs.map((p) => [p.id, p.name]));

  return db
    .select()
    .from(clients)
    .all()
    .map((c) => {
      const days = daysUntil(c.expireDate);
      return {
        id: c.id,
        label: c.customerName ?? c.username ?? c.mac ?? "Client",
        providerName: provMap.get(c.providerId) ?? "—",
        expireDate: c.expireDate,
        days: days ?? 0,
        expired: days != null && days < 0,
        _keep:
          days != null &&
          // upcoming only: today through the window (no already-expired clutter)
          days >= 0 &&
          days <= withinDays &&
          // ignore lines we already know are disabled (no point alerting)
          effectiveStatus(c.status, c.expireDate) !== "disabled",
      };
    })
    .filter((r) => r._keep)
    .map(({ _keep, ...rest }) => rest)
    .sort((a, b) => a.days - b.days);
}

export function getRecentActivity(limit = 8) {
  return db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.id))
    .limit(limit)
    .all();
}

export function getNewOrderCount(): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, "new"))
    .get();
  return row?.n ?? 0;
}

export function getOrders() {
  return db.select().from(orders).orderBy(desc(orders.id)).all();
}

export function getOrder(id: number) {
  return db.select().from(orders).where(eq(orders.id, id)).get();
}

export type LeaderboardRow = {
  agentId: number;
  name: string;
  points: number;
  onboard: number;
  outreach: number;
  retention: number;
};

/** Agent points ranking for a period ("month" = current month, or "all"). */
export function getLeaderboard(period: "month" | "all"): LeaderboardRow[] {
  const rows = db
    .select({
      agentId: agentPoints.agentUserId,
      username: admin.username,
      displayName: admin.displayName,
      points: sql<number>`COALESCE(SUM(${agentPoints.points}),0)`,
      onboard: sql<number>`SUM(CASE WHEN ${agentPoints.action}='onboard' THEN 1 ELSE 0 END)`,
      outreach: sql<number>`SUM(CASE WHEN ${agentPoints.action}='outreach' THEN 1 ELSE 0 END)`,
      retention: sql<number>`SUM(CASE WHEN ${agentPoints.action}='retention' THEN 1 ELSE 0 END)`,
    })
    .from(agentPoints)
    .innerJoin(admin, eq(admin.id, agentPoints.agentUserId))
    .where(
      period === "month"
        ? sql`substr(${agentPoints.createdAt},1,7) = ${new Date().toISOString().slice(0, 7)}`
        : sql`1=1`,
    )
    .groupBy(agentPoints.agentUserId)
    .orderBy(sql`points DESC`)
    .all();

  return rows.map((r) => ({
    agentId: r.agentId,
    name: r.displayName || r.username,
    points: Number(r.points),
    onboard: Number(r.onboard),
    outreach: Number(r.outreach),
    retention: Number(r.retention),
  }));
}

export function getProviderName(id: number | null): string {
  if (id == null) return "—";
  const p = db.select().from(providers).where(eq(providers.id, id)).get();
  return p?.name ?? "—";
}
