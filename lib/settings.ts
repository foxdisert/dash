import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";

/** Setting keys. Secret values are stored encrypted. */
export const SETTING_KEYS = {
  telegramBotToken: "telegram_bot_token", // encrypted
  telegramChatId: "telegram_chat_id",
  notifyDays: "notify_days",
  // SMTP
  smtpHost: "smtp_host",
  smtpPort: "smtp_port",
  smtpSecure: "smtp_secure",
  smtpUser: "smtp_user",
  smtpPass: "smtp_pass", // encrypted
  emailFromName: "email_from_name",
  emailFromAddress: "email_from_address",
  // Business variables (used in message templates)
  businessName: "business_name",
  whatsappNumber: "whatsapp_number",
  installationUrl: "installation_url",
  downloaderCode: "downloader_code",
  paymentDetails: "payment_details",
  customDomains: "custom_domains", // newline/comma separated host domains
  // Agent gamification point values
  pointsOnboard: "points_onboard",
  pointsOutreach: "points_outreach",
  pointsRetention: "points_retention",
} as const;

const SECRET_KEYS = new Set<string>([
  SETTING_KEYS.telegramBotToken,
  SETTING_KEYS.smtpPass,
]);

export function getSetting(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  if (!row?.value) return null;
  if (SECRET_KEYS.has(key)) {
    try {
      return decrypt(row.value);
    } catch {
      return null;
    }
  }
  return row.value;
}

export function setSetting(key: string, value: string | null): void {
  // Empty string clears the setting.
  if (value == null || value === "") {
    db.delete(appSettings).where(eq(appSettings.key, key)).run();
    return;
  }
  const stored = SECRET_KEYS.has(key) ? encrypt(value) : value;
  db.insert(appSettings)
    .values({ key, value: stored, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: stored, updatedAt: new Date().toISOString() },
    })
    .run();
}

/** Telegram config — DB setting wins, falls back to env var. */
export function getTelegramConfig(): { token: string | null; chatId: string | null } {
  return {
    token:
      getSetting(SETTING_KEYS.telegramBotToken) ??
      process.env.TELEGRAM_BOT_TOKEN ??
      null,
    chatId:
      getSetting(SETTING_KEYS.telegramChatId) ??
      process.env.TELEGRAM_CHAT_ID ??
      null,
  };
}

/** Notify threshold in days — DB setting wins, then env, then 2. */
export function getNotifyDays(): number {
  const fromDb = getSetting(SETTING_KEYS.notifyDays);
  const raw = fromDb ?? process.env.NOTIFY_DAYS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export type SmtpConfig = {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  fromName: string;
  fromAddress: string | null;
};

/** SMTP config — DB settings win, env vars as fallback. */
export function getSmtpConfig(): SmtpConfig {
  const host = getSetting(SETTING_KEYS.smtpHost) ?? process.env.SMTP_HOST ?? null;
  const portRaw = getSetting(SETTING_KEYS.smtpPort) ?? process.env.SMTP_PORT ?? "587";
  const secureRaw = getSetting(SETTING_KEYS.smtpSecure) ?? process.env.SMTP_SECURE;
  return {
    host,
    port: Number(portRaw) || 587,
    secure: secureRaw === "true" || secureRaw === "1",
    user: getSetting(SETTING_KEYS.smtpUser) ?? process.env.SMTP_USER ?? null,
    pass: getSetting(SETTING_KEYS.smtpPass) ?? process.env.SMTP_PASS ?? null,
    fromName:
      getSetting(SETTING_KEYS.emailFromName) ??
      process.env.EMAIL_FROM_NAME ??
      getBusinessVars().business_name,
    fromAddress:
      getSetting(SETTING_KEYS.emailFromAddress) ??
      process.env.EMAIL_FROM_ADDRESS ??
      null,
  };
}

export function smtpConfigured(): boolean {
  const c = getSmtpConfig();
  return Boolean(c.host && c.user && c.pass && c.fromAddress);
}

/** Business variables used by message templates (with sensible defaults). */
export function getBusinessVars(): {
  business_name: string;
  from_name: string;
  whatsapp_number: string;
  installation_url: string;
  downloader_code: string;
  payment_details: string;
} {
  return {
    business_name: getSetting(SETTING_KEYS.businessName) ?? "MorsarDash",
    from_name:
      getSetting(SETTING_KEYS.emailFromName) ??
      getSetting(SETTING_KEYS.businessName) ??
      "Support",
    whatsapp_number: getSetting(SETTING_KEYS.whatsappNumber) ?? "",
    installation_url: getSetting(SETTING_KEYS.installationUrl) ?? "",
    downloader_code: getSetting(SETTING_KEYS.downloaderCode) ?? "",
    payment_details: getSetting(SETTING_KEYS.paymentDetails) ?? "",
  };
}

/** Custom host domains (for branded M3U/Xtream links), parsed from settings. */
export function getCustomDomains(): string[] {
  const raw = getSetting(SETTING_KEYS.customDomains) ?? "";
  return raw
    .split(/[\n,]+/)
    .map((d) => d.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
    .filter(Boolean);
}

/** Whether the chat id / token came from the DB (vs env fallback). */
export function telegramSettingsSource() {
  return {
    tokenInDb: getSetting(SETTING_KEYS.telegramBotToken) != null,
    chatIdInDb: getSetting(SETTING_KEYS.telegramChatId) != null,
    notifyDaysInDb: getSetting(SETTING_KEYS.notifyDays) != null,
  };
}
