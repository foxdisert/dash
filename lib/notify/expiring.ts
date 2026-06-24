import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, clients } from "@/lib/db/schema";
import {
  daysUntil,
  getExpiringNotifications,
  notifyThresholdDays,
  type ExpiringNotification,
} from "@/lib/queries";
import { sendTelegram, telegramConfigured, type TelegramResult } from "./telegram";
import { sendEmail, smtpConfigured } from "./email";
import { getTemplate } from "@/lib/messages/store";
import { buildClientVars, renderTemplate } from "@/lib/messages/render";

function escapeMd(s: string): string {
  return s.replace(/([_*`\[\]])/g, "\\$1");
}

/** Formats the list of expiring clients as a Telegram Markdown message. */
export function formatExpiringMessage(items: ExpiringNotification[]): string {
  const days = notifyThresholdDays();
  if (items.length === 0) {
    return `✅ *MorsarDash* — no clients expiring within ${days} day(s).`;
  }

  const lines = items.map((it) => {
    const when = it.expired
      ? "❌ expired"
      : it.days === 0
        ? "⏰ today"
        : `⏳ ${it.days}d`;
    const date = it.expireDate ? ` (${it.expireDate})` : "";
    return `• *${escapeMd(it.label)}* — ${when}${date} · ${escapeMd(it.providerName)}`;
  });

  return [
    `🔔 *MorsarDash alert* — ${items.length} line(s) expiring within ${days} day(s):`,
    "",
    ...lines,
  ].join("\n");
}

export type ExpiringCheckResult = {
  count: number;
  items: ExpiringNotification[];
  telegram: TelegramResult | { ok: false; skipped: true; reason: string };
  emailsSent: number;
};

/**
 * Auto-emails the renewal reminder to expiring clients that have an email,
 * at most once per expiry cycle (guarded by clients.lastReminderAt). Returns
 * how many emails were sent.
 */
async function sendExpiryEmails(): Promise<number> {
  if (!smtpConfigured()) return 0;
  const tpl = getTemplate("expiry_reminder");
  if (!tpl) return 0;

  const threshold = notifyThresholdDays();
  let sent = 0;

  for (const c of db.select().from(clients).all()) {
    if (!c.customerEmail) continue;
    const days = daysUntil(c.expireDate);
    if (days == null || days > threshold) continue; // not in the reminder window
    if (c.status === "disabled") continue;

    // Reminder-window start = expireDate − threshold. Skip if we already
    // reminded since then (one email per cycle; resets when they renew).
    if (c.lastReminderAt && c.expireDate) {
      const windowStart = new Date(c.expireDate);
      windowStart.setDate(windowStart.getDate() - threshold);
      if (new Date(c.lastReminderAt) >= windowStart) continue;
    }

    const vars = buildClientVars(c);
    const res = await sendEmail({
      to: c.customerEmail,
      subject: renderTemplate(tpl.subject ?? "", vars),
      text: renderTemplate(tpl.body, vars),
    });

    if (res.ok) {
      sent++;
      db.update(clients)
        .set({ lastReminderAt: new Date().toISOString() })
        .where(eq(clients.id, c.id))
        .run();
      db.insert(activityLog)
        .values({
          providerId: c.providerId,
          clientId: c.id,
          action: "email",
          message: `Auto renewal reminder to ${c.customerEmail}`,
        })
        .run();
    }
  }
  return sent;
}

/**
 * Computes the expiring set, auto-emails reminders, and pushes a Telegram digest.
 * Used by the cron endpoint.
 */
export async function runExpiringCheck(): Promise<ExpiringCheckResult> {
  const items = getExpiringNotifications();
  const emailsSent = await sendExpiryEmails();

  if (!telegramConfigured()) {
    return {
      count: items.length,
      items,
      emailsSent,
      telegram: { ok: false, skipped: true, reason: "Telegram not configured." },
    };
  }

  const telegram = await sendTelegram(formatExpiringMessage(items));
  return { count: items.length, items, emailsSent, telegram };
}
