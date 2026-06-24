import "server-only";
import { getTelegramConfig } from "@/lib/settings";

export type TelegramResult =
  | { ok: true; skipped?: false }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; reason: string };

export function telegramConfigured(): boolean {
  const { token, chatId } = getTelegramConfig();
  return Boolean(token && chatId);
}

/** Sends a Markdown message to the configured Telegram chat. */
export async function sendTelegram(text: string): Promise<TelegramResult> {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return {
      ok: false,
      skipped: true,
      reason: "Telegram not configured — add a bot token and chat id in Settings.",
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `Telegram HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed" };
  }
}
