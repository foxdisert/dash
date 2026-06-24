"use server";

import { revalidatePath } from "next/cache";
import { getSmtpConfig, SETTING_KEYS, setSetting } from "@/lib/settings";
import { sendTelegram } from "@/lib/notify/telegram";
import { sendEmail } from "@/lib/notify/email";
import { ensureAdmin } from "@/lib/auth/guard";

export type ActionResult = { ok: boolean; message: string };

const TOKEN_UNCHANGED = "__unchanged__";
const DENIED: ActionResult = {
  ok: false,
  message: "Not allowed — admin only.",
};

export async function saveTelegramSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const token = String(formData.get("botToken") ?? "").trim();
  const chatId = String(formData.get("chatId") ?? "").trim();
  const notifyDaysRaw = String(formData.get("notifyDays") ?? "").trim();

  // Only overwrite the token if the user typed a new one (the field shows a mask).
  if (token && token !== TOKEN_UNCHANGED) {
    setSetting(SETTING_KEYS.telegramBotToken, token);
  } else if (token === "") {
    // explicit clear
    setSetting(SETTING_KEYS.telegramBotToken, "");
  }

  setSetting(SETTING_KEYS.telegramChatId, chatId);

  if (notifyDaysRaw) {
    const n = Number(notifyDaysRaw);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, message: "Notify days must be a number ≥ 1." };
    }
    setSetting(SETTING_KEYS.notifyDays, String(Math.floor(n)));
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

const PASS_UNCHANGED = "__unchanged__";

export async function saveSmtpSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const host = String(formData.get("smtpHost") ?? "").trim();
  const port = String(formData.get("smtpPort") ?? "").trim();
  const secure = formData.get("smtpSecure") != null;
  const user = String(formData.get("smtpUser") ?? "").trim();
  const pass = String(formData.get("smtpPass") ?? "").trim();
  const fromName = String(formData.get("emailFromName") ?? "").trim();
  const fromAddress = String(formData.get("emailFromAddress") ?? "").trim();

  setSetting(SETTING_KEYS.smtpHost, host);
  setSetting(SETTING_KEYS.smtpPort, port);
  setSetting(SETTING_KEYS.smtpSecure, secure ? "true" : "false");
  setSetting(SETTING_KEYS.smtpUser, user);
  setSetting(SETTING_KEYS.emailFromName, fromName);
  setSetting(SETTING_KEYS.emailFromAddress, fromAddress);
  // Only overwrite the password if a new one was typed.
  if (pass && pass !== PASS_UNCHANGED) {
    setSetting(SETTING_KEYS.smtpPass, pass);
  }

  revalidatePath("/settings");
  return { ok: true, message: "SMTP settings saved." };
}

export async function saveBusinessSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  setSetting(SETTING_KEYS.businessName, String(formData.get("businessName") ?? "").trim());
  setSetting(SETTING_KEYS.whatsappNumber, String(formData.get("whatsappNumber") ?? "").trim());
  setSetting(SETTING_KEYS.installationUrl, String(formData.get("installationUrl") ?? "").trim());
  setSetting(SETTING_KEYS.downloaderCode, String(formData.get("downloaderCode") ?? "").trim());
  setSetting(SETTING_KEYS.paymentDetails, String(formData.get("paymentDetails") ?? "").trim());

  revalidatePath("/settings");
  revalidatePath("/clients");
  revalidatePath("/messages");
  revalidatePath("/clients");
  return { ok: true, message: "Business details saved." };
}

export async function saveAgentPoints(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const clean = (v: FormDataEntryValue | null) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? String(n) : "0";
  };
  setSetting(SETTING_KEYS.pointsOnboard, clean(formData.get("pointsOnboard")));
  setSetting(SETTING_KEYS.pointsOutreach, clean(formData.get("pointsOutreach")));
  setSetting(SETTING_KEYS.pointsRetention, clean(formData.get("pointsRetention")));
  revalidatePath("/settings");
  revalidatePath("/leaderboard");
  return { ok: true, message: "Point values saved." };
}

export async function sendTestEmail(to?: string): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const recipient = (to ?? "").trim() || getSmtpConfig().fromAddress;
  if (!recipient)
    return {
      ok: false,
      message: "Enter a recipient, or set a 'from' address first and save.",
    };
  const res = await sendEmail({
    to: recipient,
    subject: "✅ MorsarDash test email",
    text: "This is a test email from MorsarDash. Your SMTP settings are working!",
  });
  if (res.ok) return { ok: true, message: `Test email sent to ${recipient}.` };
  if ("skipped" in res && res.skipped) return { ok: false, message: res.reason };
  return { ok: false, message: res.reason };
}

export async function sendTestTelegram(): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const res = await sendTelegram(
    "✅ *MorsarDash* test message — your Telegram alerts are working!",
  );
  if (res.ok) return { ok: true, message: "Test message sent — check Telegram." };
  if ("skipped" in res && res.skipped)
    return { ok: false, message: res.reason };
  return { ok: false, message: res.reason };
}
