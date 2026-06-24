import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { admin as adminTable, clients, providers } from "@/lib/db/schema";
import { getProviderKindMeta } from "@/lib/providers/registry";
import { daysUntil, effectiveStatus } from "@/lib/queries";
import { buildClientVars } from "@/lib/messages/render";
import { listTemplates } from "@/lib/messages/store";
import { smtpConfigured } from "@/lib/settings";
import { parseHosts } from "@/lib/messages/clientRender";
import { requireSession, isAdmin } from "@/lib/auth/guard";
import { ClientsTable, type ClientRow } from "./ClientsTable";
import { NBCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await requireSession();
  const admin = isAdmin(session);
  const provs = db.select().from(providers).all();
  const provMap = new Map(provs.map((p) => [p.id, p]));
  const agentRows = db.select().from(adminTable).all();
  const agentMap = new Map(
    agentRows.map((a) => [a.id, a.displayName || a.username]),
  );
  const agents = agentRows
    .filter((a) => a.role === "agent")
    .map((a) => ({ id: a.id, name: a.displayName || a.username }));
  const templates = listTemplates().map((t) => ({
    key: t.key,
    name: t.name,
    channel: t.channel,
    subject: t.subject ?? "",
    body: t.body,
  }));
  const emailReady = smtpConfigured();

  const rows: ClientRow[] = db
    .select()
    .from(clients)
    .orderBy(desc(clients.id))
    .all()
    .map((c) => {
      const prov = provMap.get(c.providerId);
      const meta = prov ? getProviderKindMeta(prov.kind) : undefined;
      const hostOptions = parseHosts(prov?.host);
      const subs = meta?.subOptions[c.type as "m3u" | "mag" | "protocol"] ?? [
        1, 3, 6, 12,
      ];
      return {
        id: c.id,
        providerName: prov?.name ?? "—",
        type: c.type,
        username: c.username,
        mac: c.mac,
        expireDate: c.expireDate,
        days: daysUntil(c.expireDate),
        status: effectiveStatus(c.status, c.expireDate),
        source: c.source,
        note: c.note,
        plan: c.plan,
        orderDate: c.orderDate,
        assignedAgentId: c.assignedAgentId,
        ownerName: c.assignedAgentId
          ? (agentMap.get(c.assignedAgentId) ?? null)
          : null,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        customerPhone: c.customerPhone,
        lastSyncedAt: c.lastSyncedAt,
        renewSubs: subs.filter((s) => s !== 99),
        hostOptions,
        vars: buildClientVars(c, hostOptions[0]),
      };
    });

  const providerOptions = provs.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">👥 Clients</h1>
          <p className="text-sm text-ink/70">
            {rows.length} tracked line{rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/clients/import" className="nb-btn bg-blue">
            📥 Add / import
          </Link>
          {admin && (
            <Link href="/clients/new" className="nb-btn bg-lime">
              ➕ New line
            </Link>
          )}
        </div>
      </header>

      {rows.length === 0 ? (
        <NBCard className="bg-pink/40">
          <p className="font-bold">No clients yet.</p>
          <p className="text-sm">
            Create a new line (spends credits) or import the ones you already
            have (free).
          </p>
        </NBCard>
      ) : (
        <ClientsTable
          rows={rows}
          providers={providerOptions}
          templates={templates}
          emailReady={emailReady}
          isAdmin={admin}
          agents={agents}
        />
      )}
    </div>
  );
}
