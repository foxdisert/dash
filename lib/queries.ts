import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, clients, orders, providers } from "@/lib/db/schema";
import { clientFor } from "@/lib/providers";
import { getNotifyDays } from "@/lib/settings";

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function effectiveStatus(
  status: string,
  expireDate: string | null,
): "active" | "expired" | "disabled" | "unknown" {
  if (status === "disabled") return "disabled";
  const d = daysUntil(expireDate);
  if (d != null) return d < 0 ? "expired" : "active";
  return (status as "active" | "expired" | "disabled" | "unknown") ?? "unknown";
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
  const stats = { total: rows.length, active: 0, expired: 0, disabled: 0, unknown: 0 };
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

export function getProviderName(id: number | null): string {
  if (id == null) return "—";
  const p = db.select().from(providers).where(eq(providers.id, id)).get();
  return p?.name ?? "—";
}
