import "server-only";
import type { Client } from "@/lib/db/schema";
import { getBusinessVars } from "@/lib/settings";
import { daysUntil } from "@/lib/queries";

export type TemplateVars = Record<string, string>;

/** Replaces {{var}} placeholders. Unknown vars are left blank. */
export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) =>
    vars[key] != null ? vars[key] : "",
  );
}

function expiryPhrase(days: number | null): string {
  if (days == null) return "soon";
  if (days < 0) return "has expired";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Builds the full variable set for a client (client fields + business vars). */
export function buildClientVars(client: Client): TemplateVars {
  const biz = getBusinessVars();
  const days = daysUntil(client.expireDate);
  return {
    ...biz,
    name: client.customerName?.trim() || "there",
    username: client.username ?? "",
    expiry_date: client.expireDate ?? "",
    days_left: days != null ? String(days) : "",
    expiry_phrase: expiryPhrase(days),
    plan: client.subMonths ? `${client.subMonths} month(s)` : "",
    months: client.subMonths ? String(client.subMonths) : "",
  };
}

/** Builds a wa.me click-to-chat link with a pre-filled message. */
export function waLink(phone: string, text: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
