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

/**
 * Resolves connection details from a line. Handles both shapes:
 *  - base host in `url` + separate username/password columns (Dino), and
 *  - a full M3U link in `url` with username/password embedded (Strong 8K).
 */
export function connectionLinks(
  client: Client,
  providerHost?: string | null,
): { m3uUrl: string; xtreamServer: string; username: string; password: string } {
  const raw = (client.url ?? "").trim();
  let username = client.username ?? "";
  let password = client.password ?? "";
  let urlHost = "";
  let proto = "http";

  if (raw) {
    try {
      const u = new URL(raw);
      proto = u.protocol.replace(":", "") || "http";
      urlHost = u.host; // may be empty if the panel returned no host
      const qpUser = u.searchParams.get("username");
      const qpPass = u.searchParams.get("password");
      if (qpUser) username = qpUser;
      if (qpPass) password = qpPass;
    } catch {
      /* not a parseable URL */
    }
  }

  // Prefer the provider's configured host (your branded domain); fall back to
  // whatever host the panel returned. Some panels (Dino) return an empty host.
  const host = (providerHost || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "") || urlHost;
  if (!host) return { m3uUrl: "", xtreamServer: "", username, password };

  const scheme = proto.startsWith("https") ? "https" : "http";
  const xtreamServer = `${scheme}://${host}`;
  const m3uUrl =
    username && password
      ? `${xtreamServer}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`
      : "";

  return { m3uUrl, xtreamServer, username, password };
}

/** Builds the full variable set for a client (client fields + business vars). */
export function buildClientVars(
  client: Client,
  providerHost?: string | null,
): TemplateVars {
  const biz = getBusinessVars();
  const days = daysUntil(client.expireDate);
  const { m3uUrl, xtreamServer, username, password } = connectionLinks(
    client,
    providerHost,
  );
  return {
    ...biz,
    name: client.customerName?.trim() || "there",
    username,
    password,
    expiry_date: client.expireDate ?? "",
    days_left: days != null ? String(days) : "",
    expiry_phrase: expiryPhrase(days),
    plan: client.plan || (client.subMonths ? `${client.subMonths} month(s)` : ""),
    months: client.subMonths ? String(client.subMonths) : "",
    m3u_url: m3uUrl,
    xtream_server: xtreamServer,
    xtream_url: xtreamServer,
  };
}

/** Builds a wa.me click-to-chat link with a pre-filled message. */
export function waLink(phone: string, text: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
