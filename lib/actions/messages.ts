"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, clients } from "@/lib/db/schema";
import { getTemplate, updateTemplate } from "@/lib/messages/store";
import { buildClientVars, renderTemplate } from "@/lib/messages/render";
import { sendEmail } from "@/lib/notify/email";
import { ensureAdmin } from "@/lib/auth/guard";

export type ActionResult = { ok: boolean; message: string };

export async function saveTemplate(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin()))
    return { ok: false, message: "Not allowed — admin only." };
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const channel = String(formData.get("channel") ?? "both");

  if (!id) return { ok: false, message: "Missing template id." };
  if (!name || !body) return { ok: false, message: "Name and body are required." };

  updateTemplate(id, { name, subject, body, channel });
  revalidatePath("/messages");
  revalidatePath("/clients");
  return { ok: true, message: "Template saved." };
}

/** Sends a rendered template to a client by email (authoritative server render). */
export async function sendClientEmail(
  clientId: number,
  templateKey: string,
): Promise<ActionResult> {
  const client = db.select().from(clients).where(eq(clients.id, clientId)).get();
  if (!client) return { ok: false, message: "Client not found." };
  if (!client.customerEmail)
    return { ok: false, message: "This client has no email address." };

  const tpl = getTemplate(templateKey);
  if (!tpl) return { ok: false, message: "Template not found." };

  const vars = buildClientVars(client);
  const subject = renderTemplate(tpl.subject ?? "", vars);
  const text = renderTemplate(tpl.body, vars);

  const res = await sendEmail({ to: client.customerEmail, subject, text });
  if (!res.ok) return { ok: false, message: res.reason };

  db.insert(activityLog)
    .values({
      providerId: client.providerId,
      clientId,
      action: "email",
      message: `Sent “${tpl.name}” to ${client.customerEmail}`,
    })
    .run();

  revalidatePath("/clients");
  revalidatePath("/");
  return { ok: true, message: `Email sent to ${client.customerEmail}.` };
}
