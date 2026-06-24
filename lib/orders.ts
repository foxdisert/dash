import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, type Order } from "@/lib/db/schema";
import { sendTelegram, telegramConfigured } from "@/lib/notify/telegram";

/** Picks the first present value among several possible keys. */
function pick(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).trim();
  }
  return undefined;
}

export type RecordOrderResult = {
  ok: true;
  orderId: number;
  duplicate: boolean;
};

/**
 * Maps a (tolerant) incoming webhook body to an order row, deduping on
 * transaction id (or external id when no txn). Returns the order id.
 */
export function recordOrder(body: Record<string, unknown>): RecordOrderResult {
  const transactionId = pick(body, "transaction_id", "txn_id", "transactionId");
  const externalId = pick(body, "external_id", "entry_id", "externalId", "id");

  // Dedupe.
  let existing: Order | undefined;
  if (transactionId) {
    existing = db
      .select()
      .from(orders)
      .where(eq(orders.transactionId, transactionId))
      .get();
  }
  if (!existing && externalId) {
    existing = db
      .select()
      .from(orders)
      .where(eq(orders.externalId, externalId))
      .get();
  }
  if (existing) return { ok: true, orderId: existing.id, duplicate: true };

  const connRaw = pick(body, "connections", "connection", "lines");
  const inserted = db
    .insert(orders)
    .values({
      source: pick(body, "source") ?? "wordpress",
      externalId,
      submittedAt: pick(body, "submitted_at", "date", "submittedAt"),
      fullName: pick(body, "full_name", "name", "fullName"),
      whatsapp: pick(body, "whatsapp", "whatsapp_number", "phone", "whatsappNumber"),
      email: pick(body, "email", "email_address", "emailAddress"),
      planLabel: pick(body, "plan", "select", "plan_label", "subscription", "planLabel"),
      connections: connRaw ? Number(connRaw) || null : null,
      amount: pick(body, "amount", "total", "total_in_us_dollars"),
      currency: pick(body, "currency") ?? "USD",
      paymentStatus: pick(body, "payment_status", "status", "paymentStatus"),
      paymentMode: pick(body, "payment_mode", "mode", "paymentMode"),
      transactionId,
      raw: JSON.stringify(body),
      status: "new",
    })
    .run();

  return { ok: true, orderId: Number(inserted.lastInsertRowid), duplicate: false };
}

export type OrderPrefill = {
  orderId: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  sub?: number; // best-effort months parsed from the plan label
};

/** Builds form-prefill values from an order (for the convert flow). */
export function orderPrefill(o: Order): OrderPrefill {
  const monthMatch = o.planLabel?.match(/(\d+)\s*month/i);
  const noteParts = [
    o.planLabel,
    o.connections ? `${o.connections} conn` : null,
    o.transactionId ? `PayPal ${o.transactionId}` : null,
  ].filter(Boolean);
  return {
    orderId: o.id,
    name: o.fullName ?? "",
    email: o.email ?? "",
    phone: o.whatsapp ?? "",
    note: noteParts.join(" · "),
    sub: monthMatch ? Number(monthMatch[1]) : undefined,
  };
}

/** Marks an order converted and links it to a client (called post-create/import). */
export function markOrderConverted(orderId: number, clientId: number): void {
  db.update(orders)
    .set({ status: "converted", clientId })
    .where(eq(orders.id, orderId))
    .run();
}

/** Escapes Telegram (legacy) Markdown special characters in a value. */
function esc(v: unknown): string {
  return String(v ?? "").replace(/([_*`\[])/g, "\\$1");
}

/** Sends a Telegram alert with the FULL order details, if configured. */
export async function notifyNewOrder(orderId: number): Promise<void> {
  if (!telegramConfigured()) return;
  const o = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!o) return;

  const waDigits = (o.whatsapp ?? "").replace(/[^\d]/g, "");
  const amount =
    o.amount != null && o.amount !== ""
      ? `${o.amount} ${o.currency ?? ""}`.trim()
      : null;

  const lines = [
    `🛒 *New order${o.externalId ? ` #${esc(o.externalId)}` : ""}*`,
    "",
    o.fullName ? `👤 *Name:* ${esc(o.fullName)}` : null,
    o.email ? `📧 *Email:* ${esc(o.email)}` : null,
    o.whatsapp
      ? `📱 *WhatsApp:* ${esc(o.whatsapp)}${waDigits ? ` — [chat](https://wa.me/${waDigits})` : ""}`
      : null,
    o.planLabel ? `📦 *Plan:* ${esc(o.planLabel)}` : null,
    o.connections != null ? `🔢 *Connections:* ${esc(o.connections)}` : null,
    amount ? `💰 *Amount:* ${esc(amount)}` : null,
    o.paymentStatus
      ? `💳 *Payment:* ${esc(o.paymentStatus)}${o.paymentMode ? ` (${esc(o.paymentMode)})` : ""}`
      : null,
    o.transactionId ? `🧾 *Txn:* ${esc(o.transactionId)}` : null,
    o.submittedAt ? `🕒 *Submitted:* ${esc(o.submittedAt)}` : null,
  ].filter(Boolean);

  await sendTelegram(lines.join("\n"));
}
