"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NBBadge, NBButton, NBCard, NBInput, NBLabel } from "@/components/ui";
import { applyVars } from "@/lib/messages/clientRender";
import { saveTemplate } from "@/lib/actions/messages";
import { useToast } from "@/components/Toast";

type Template = {
  id: number;
  key: string;
  name: string;
  channel: string;
  subject: string;
  body: string;
};

export function MessagesClient({
  templates,
  sampleVars,
}: {
  templates: Template[];
  sampleVars: Record<string, string>;
}) {
  const [activeKey, setActiveKey] = useState(templates[0]?.key ?? "");
  const active = templates.find((t) => t.key === activeKey) ?? templates[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveKey(t.key)}
            className={`nb-btn justify-start ${
              t.key === activeKey ? "bg-pink" : "bg-white"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {active && (
        <TemplateEditor key={active.id} template={active} sampleVars={sampleVars} />
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  sampleVars,
}: {
  template: Template;
  sampleVars: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    const res = await saveTemplate(null, formData);
    setMsg(res);
    toast.result(res);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <NBCard>
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="id" value={template.id} />
          <input type="hidden" name="channel" value={template.channel} />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Edit template</h2>
            <NBBadge color="blue">{template.channel}</NBBadge>
          </div>
          <div>
            <NBLabel>Name</NBLabel>
            <NBInput name="name" defaultValue={template.name} />
          </div>
          <div>
            <NBLabel>Subject (email)</NBLabel>
            <NBInput
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <NBLabel>Body</NBLabel>
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full rounded-lg border-[3px] border-ink bg-white px-3 py-2 font-medium outline-none focus:shadow-[4px_4px_0_0_#131313]"
            />
          </div>
          {msg && (
            <p
              className={`rounded-md border-2 border-ink px-3 py-2 text-sm font-bold ${
                msg.ok ? "bg-lime" : "bg-red text-white"
              }`}
            >
              {msg.message}
            </p>
          )}
          <NBButton type="submit" color="lime" disabled={busy}>
            {busy ? "Saving…" : "Save template"}
          </NBButton>
        </form>
      </NBCard>

      <NBCard className="bg-paper">
        <h2 className="mb-3 text-lg font-bold">👀 Preview (sample client)</h2>
        <div className="rounded-lg border-2 border-ink bg-white p-4">
          {subject && (
            <p className="mb-2 border-b-2 border-dashed border-ink pb-2 font-bold">
              {applyVars(subject, sampleVars)}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {applyVars(body, sampleVars)}
          </p>
        </div>
        <p className="mt-3 text-xs text-ink/60">
          Variables: name, username, password, expiry_date, days_left,
          expiry_phrase, plan, m3u_url, xtream_server, business_name, from_name,
          whatsapp_number, installation_url, downloader_code, payment_details.
        </p>
      </NBCard>
    </div>
  );
}
