import {
  getBusinessVars,
  getNotifyDays,
  getSetting,
  getSmtpConfig,
  getTelegramConfig,
  SETTING_KEYS,
  smtpConfigured,
  telegramSettingsSource,
} from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { requireAdmin } from "@/lib/auth/guard";
import { getPointValues } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const { token, chatId } = getTelegramConfig();
  const source = telegramSettingsSource();
  const cronSecretSet = Boolean(process.env.CRON_SECRET);
  const ordersSecretSet = Boolean(process.env.ORDERS_WEBHOOK_SECRET);
  const smtp = getSmtpConfig();
  const biz = getBusinessVars();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">⚙️ Settings</h1>
        <p className="text-sm text-ink/70">
          Email (SMTP), business details, and notification alerts.
        </p>
      </header>

      <SettingsForm
        tokenConfigured={Boolean(token)}
        tokenFromEnv={Boolean(token) && !source.tokenInDb}
        chatId={getSetting(SETTING_KEYS.telegramChatId) ?? chatId ?? ""}
        notifyDays={getNotifyDays()}
        cronSecretSet={cronSecretSet}
        smtp={{
          host: smtp.host ?? "smtp-relay.brevo.com",
          port: smtp.port || 587,
          secure: smtp.secure,
          user: smtp.user ?? "",
          fromName: getSetting(SETTING_KEYS.emailFromName) ?? "",
          fromAddress: smtp.fromAddress ?? "",
          configured: smtpConfigured(),
          passSet: Boolean(getSetting(SETTING_KEYS.smtpPass)),
        }}
        business={biz}
        ordersSecretSet={ordersSecretSet}
        points={getPointValues()}
      />
    </div>
  );
}
