import { listTemplates } from "@/lib/messages/store";
import { getBusinessVars } from "@/lib/settings";
import { MessagesClient } from "./MessagesClient";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requireAdmin();
  const templates = listTemplates();
  const biz = getBusinessVars();

  // Sample variables so the preview shows realistic, filled-in text.
  const sampleVars: Record<string, string> = {
    ...biz,
    name: "John",
    username: "john_tv",
    expiry_date: "2026-07-01",
    days_left: "2",
    expiry_phrase: "in 2 days",
    plan: "3 month(s)",
    months: "3",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">💬 Messages</h1>
        <p className="text-sm text-ink/70">
          Edit the templates you send to clients. Use{" "}
          <code>{"{{variables}}"}</code> — they auto-fill per client. Set your
          business values in{" "}
          <a href="/settings" className="underline">
            Settings
          </a>
          .
        </p>
      </header>

      <MessagesClient
        templates={templates.map((t) => ({
          id: t.id,
          key: t.key,
          name: t.name,
          channel: t.channel,
          subject: t.subject ?? "",
          body: t.body,
        }))}
        sampleVars={sampleVars}
      />
    </div>
  );
}
