import "server-only";
import nodemailer from "nodemailer";
import { getSmtpConfig, smtpConfigured } from "@/lib/settings";

export type EmailResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; reason: string };

export { smtpConfigured };

/** Wraps a plain-text body in a simple branded HTML email. */
export function textToHtml(text: string, businessName: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // linkify bare URLs
  const linked = escaped.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color:#23a094">$1</a>',
  );
  const bodyHtml = linked.replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#fef7e8;font-family:Arial,Helvetica,sans-serif;color:#131313">
  <div style="max-width:560px;margin:24px auto;padding:24px;background:#ffffff;border:3px solid #131313;border-radius:12px">
    <div style="font-size:20px;font-weight:bold;margin-bottom:16px">📺 ${businessName}</div>
    <div style="font-size:15px;line-height:1.6">${bodyHtml}</div>
  </div>
</body></html>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailResult> {
  if (!smtpConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "Email not configured — add SMTP settings in Settings.",
    };
  }

  const cfg = getSmtpConfig();
  try {
    const transport = nodemailer.createTransport({
      host: cfg.host!,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user!, pass: cfg.pass! },
    });

    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? textToHtml(opts.text, cfg.fromName),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "send failed" };
  }
}
