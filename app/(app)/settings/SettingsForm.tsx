"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NBBadge, NBButton, NBCard, NBInput, NBLabel } from "@/components/ui";
import {
  saveBusinessSettings,
  saveSmtpSettings,
  saveTelegramSettings,
  sendTestEmail,
  sendTestTelegram,
} from "@/lib/actions/settings";

type SmtpProps = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromAddress: string;
  configured: boolean;
  passSet: boolean;
};

type BusinessProps = {
  business_name: string;
  whatsapp_number: string;
  installation_url: string;
  downloader_code: string;
  payment_details: string;
};

function Flash({ msg }: { msg: { ok: boolean; message: string } | null }) {
  if (!msg) return null;
  return (
    <p
      className={`rounded-md border-2 border-ink px-3 py-2 text-sm font-bold ${
        msg.ok ? "bg-lime" : "bg-red text-white"
      }`}
    >
      {msg.message}
    </p>
  );
}

export function SettingsForm({
  tokenConfigured,
  tokenFromEnv,
  chatId,
  notifyDays,
  cronSecretSet,
  smtp,
  business,
  ordersSecretSet,
}: {
  tokenConfigured: boolean;
  tokenFromEnv: boolean;
  chatId: string;
  notifyDays: number;
  cronSecretSet: boolean;
  smtp: SmtpProps;
  business: BusinessProps;
  ordersSecretSet: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState(false);

  // SMTP + business + email-test state
  const [smtpMsg, setSmtpMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [bizMsg, setBizMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [emailTestMsg, setEmailTestMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [smtpPending, startSmtp] = useTransition();
  const [bizPending, startBiz] = useTransition();
  const [emailTesting, setEmailTesting] = useState(false);
  const [testTo, setTestTo] = useState(smtp.fromAddress);

  function onSave(formData: FormData) {
    start(async () => {
      const res = await saveTelegramSettings(null, formData);
      setMsg(res);
      if (res.ok) router.refresh();
    });
  }

  async function onTest() {
    setTesting(true);
    setTestMsg(await sendTestTelegram());
    setTesting(false);
  }

  function onSaveSmtp(formData: FormData) {
    startSmtp(async () => {
      const res = await saveSmtpSettings(null, formData);
      setSmtpMsg(res);
      if (res.ok) router.refresh();
    });
  }

  async function onTestEmail() {
    setEmailTesting(true);
    setEmailTestMsg(await sendTestEmail(testTo));
    setEmailTesting(false);
  }

  function onSaveBusiness(formData: FormData) {
    startBiz(async () => {
      const res = await saveBusinessSettings(null, formData);
      setBizMsg(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---------- SMTP / Email ---------- */}
      <NBCard className="bg-pink/20">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">✉️ Email (SMTP)</h2>
          {smtp.configured ? (
            <NBBadge color="lime">configured</NBBadge>
          ) : (
            <NBBadge color="red">not set</NBBadge>
          )}
        </div>
        <form action={onSaveSmtp} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <NBLabel>SMTP host</NBLabel>
              <NBInput name="smtpHost" defaultValue={smtp.host} />
            </div>
            <div>
              <NBLabel>Port</NBLabel>
              <NBInput name="smtpPort" type="number" defaultValue={smtp.port} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              name="smtpSecure"
              defaultChecked={smtp.secure}
              className="size-4"
            />
            Use SSL/TLS (port 465). Leave off for STARTTLS (587).
          </label>
          <div>
            <NBLabel>SMTP username</NBLabel>
            <NBInput
              name="smtpUser"
              defaultValue={smtp.user}
              placeholder="your Brevo login email"
            />
          </div>
          <div>
            <NBLabel>SMTP password / key</NBLabel>
            <NBInput
              name="smtpPass"
              type="password"
              placeholder={
                smtp.passSet
                  ? "•••••••• (saved — leave blank to keep)"
                  : "Brevo SMTP key (Master Password)"
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <NBLabel>From name</NBLabel>
              <NBInput
                name="emailFromName"
                defaultValue={smtp.fromName}
                placeholder="MorsarTV"
              />
            </div>
            <div>
              <NBLabel>From address</NBLabel>
              <NBInput
                name="emailFromAddress"
                type="email"
                defaultValue={smtp.fromAddress}
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </div>
          <p className="text-xs text-ink/60">
            Brevo: host <code>smtp-relay.brevo.com</code>, port <code>587</code>.
            The “from” address must be a verified sender/domain in Brevo.
          </p>
          <Flash msg={smtpMsg} />
          <NBButton type="submit" color="lime" disabled={smtpPending}>
            {smtpPending ? "Saving…" : "Save SMTP"}
          </NBButton>

          <div className="mt-2 border-t-2 border-dashed border-ink pt-3">
            <NBLabel>Send a test email to</NBLabel>
            <div className="flex flex-wrap gap-2">
              <NBInput
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@email.com"
                className="flex-1"
              />
              <NBButton
                type="button"
                color="cyan"
                onClick={onTestEmail}
                disabled={emailTesting || !smtp.configured}
              >
                {emailTesting ? "Sending…" : "Send test"}
              </NBButton>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              Save your SMTP settings first. Defaults to your “from” address.
            </p>
          </div>
          <Flash msg={emailTestMsg} />
        </form>
      </NBCard>

      {/* ---------- Business details ---------- */}
      <NBCard className="bg-yellow/30">
        <h2 className="mb-4 text-xl font-bold">🏷️ Business details</h2>
        <p className="mb-3 text-xs text-ink/60">
          These fill the <code>{"{{variables}}"}</code> in your message templates.
        </p>
        <form action={onSaveBusiness} className="space-y-3">
          <div>
            <NBLabel>Business name</NBLabel>
            <NBInput name="businessName" defaultValue={business.business_name} />
          </div>
          <div>
            <NBLabel>WhatsApp number</NBLabel>
            <NBInput
              name="whatsappNumber"
              defaultValue={business.whatsapp_number}
              placeholder="+212719195125"
            />
          </div>
          <div>
            <NBLabel>Installation guide URL</NBLabel>
            <NBInput
              name="installationUrl"
              defaultValue={business.installation_url}
              placeholder="https://iptvmorsar.com/installation"
            />
          </div>
          <div>
            <NBLabel>Downloader code</NBLabel>
            <NBInput
              name="downloaderCode"
              defaultValue={business.downloader_code}
              placeholder="923441"
            />
          </div>
          <div>
            <NBLabel>Payment details</NBLabel>
            <NBInput
              name="paymentDetails"
              defaultValue={business.payment_details}
              placeholder="PayPal / bank / crypto…"
            />
          </div>
          <Flash msg={bizMsg} />
          <NBButton type="submit" color="lime" disabled={bizPending}>
            {bizPending ? "Saving…" : "Save business details"}
          </NBButton>
        </form>
      </NBCard>

      {/* ---------- Website orders ---------- */}
      <NBCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">🛒 Website orders</h2>
          {ordersSecretSet ? (
            <NBBadge color="lime">secret set</NBBadge>
          ) : (
            <NBBadge color="red">no secret</NBBadge>
          )}
        </div>
        <p className="text-sm text-ink/70">
          Have your WordPress site POST each paid order to this endpoint and it
          shows up under <strong>Orders</strong>:
        </p>
        <pre className="mt-2 overflow-auto rounded-lg border-2 border-ink bg-paper p-3 text-xs">
{`POST /api/orders/incoming?key=ORDERS_WEBHOOK_SECRET
Content-Type: application/json

{ "external_id","full_name","whatsapp","email",
  "plan","connections","amount","currency",
  "payment_status","payment_mode","transaction_id" }`}
        </pre>
        <p className="mt-2 text-xs text-ink/60">
          Set <code>ORDERS_WEBHOOK_SECRET</code> in <code>.env</code>. The ready
          Forminator PHP snippet is in the README (it fires only on paid orders).
        </p>
      </NBCard>

      {/* ---------- Telegram ---------- */}
      <NBCard className="bg-cyan/20">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">📨 Telegram alerts</h2>
          {tokenConfigured ? (
            <NBBadge color="lime">configured</NBBadge>
          ) : (
            <NBBadge color="red">not set</NBBadge>
          )}
        </div>

        <form action={onSave} className="space-y-4">
          <div>
            <NBLabel>Bot token</NBLabel>
            <NBInput
              name="botToken"
              type="password"
              placeholder={
                tokenConfigured
                  ? "•••••••• (saved — leave blank to keep)"
                  : "paste token from @BotFather"
              }
            />
            {tokenFromEnv && (
              <p className="mt-1 text-xs text-ink/60">
                Currently using the value from <code>.env</code>. Saving here
                overrides it.
              </p>
            )}
          </div>

          <div>
            <NBLabel>Chat ID</NBLabel>
            <NBInput
              name="chatId"
              defaultValue={chatId}
              placeholder="e.g. 123456789 (from @userinfobot)"
            />
          </div>

          <div>
            <NBLabel>Alert when days left ≤</NBLabel>
            <NBInput
              name="notifyDays"
              type="number"
              min={1}
              defaultValue={notifyDays}
              className="w-32"
            />
            <p className="mt-1 text-xs text-ink/60">
              Used by both the bell and the Telegram alert.
            </p>
          </div>

          <Flash msg={msg} />

          <div className="flex flex-wrap gap-2">
            <NBButton type="submit" color="lime" disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </NBButton>
            <NBButton
              type="button"
              color="white"
              onClick={onTest}
              disabled={testing || !tokenConfigured}
            >
              {testing ? "Sending…" : "Send test message"}
            </NBButton>
          </div>
          <Flash msg={testMsg} />
        </form>
      </NBCard>

      <NBCard>
        <h2 className="mb-3 text-xl font-bold">⏰ Daily Telegram alert</h2>
        <p className="text-sm text-ink/70">
          The in-app 🔔 bell works automatically. To get a daily Telegram message
          even when the dashboard is closed, have your server call this endpoint
          once a day:
        </p>
        <pre className="mt-3 overflow-auto rounded-lg border-2 border-ink bg-paper p-3 text-xs">
{`GET /api/cron/check-expiring?key=YOUR_CRON_SECRET`}
        </pre>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-bold">CRON_SECRET:</span>
          {cronSecretSet ? (
            <NBBadge color="lime">set in .env</NBBadge>
          ) : (
            <NBBadge color="red">not set — add to .env</NBBadge>
          )}
        </div>
        <p className="mt-3 text-xs text-ink/60">
          Example crontab (daily at 09:00):
        </p>
        <pre className="mt-1 overflow-auto rounded-lg border-2 border-ink bg-paper p-3 text-xs">
{`0 9 * * *  curl -fsS "https://your-domain/api/cron/check-expiring?key=YOUR_CRON_SECRET" >/dev/null`}
        </pre>
      </NBCard>
    </div>
  );
}
