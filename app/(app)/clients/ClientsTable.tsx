"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NBBadge, NBButton, NBCard, NBInput, NBLabel, NBSelect } from "@/components/ui";
import {
  deleteClient,
  renewClient,
  syncAll,
  syncClient,
  updateClientDetails,
} from "@/lib/actions/clients";
import { sendClientEmail } from "@/lib/actions/messages";
import { applyVars, waLink } from "@/lib/messages/clientRender";

export type ClientRow = {
  id: number;
  providerName: string;
  type: string;
  username: string | null;
  mac: string | null;
  expireDate: string | null;
  days: number | null;
  status: "active" | "expired" | "disabled" | "unknown";
  source: string;
  note: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  lastSyncedAt: string | null;
  renewSubs: number[];
  vars: Record<string, string>;
};

export type MsgTemplate = {
  key: string;
  name: string;
  channel: string;
  subject: string;
  body: string;
};

const STATUS_COLOR: Record<ClientRow["status"], "lime" | "red" | "yellow" | "white"> =
  {
    active: "lime",
    expired: "red",
    disabled: "red",
    unknown: "yellow",
  };

export function ClientsTable({
  rows,
  providers,
  templates,
  emailReady,
  isAdmin,
}: {
  rows: ClientRow[];
  providers: { id: number; name: string }[];
  templates: MsgTemplate[];
  emailReady: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    params.get("filter") === "expiring" ? "expiring" : "all",
  );
  const [providerFilter, setProviderFilter] = useState("all");
  const [flash, setFlash] = useState<string | null>(null);
  const [syncingAll, startSyncAll] = useTransition();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        (r.username ?? "").toLowerCase().includes(q) ||
        (r.mac ?? "").toLowerCase().includes(q) ||
        (r.note ?? "").toLowerCase().includes(q) ||
        (r.customerName ?? "").toLowerCase().includes(q) ||
        (r.customerEmail ?? "").toLowerCase().includes(q) ||
        (r.customerPhone ?? "").toLowerCase().includes(q);
      const matchProvider =
        providerFilter === "all" || r.providerName === providerFilter;
      let matchStatus = true;
      if (statusFilter === "expiring")
        matchStatus = r.days != null && r.days >= 0 && r.days <= 7;
      else if (statusFilter !== "all") matchStatus = r.status === statusFilter;
      return matchQ && matchProvider && matchStatus;
    });
  }, [rows, query, statusFilter, providerFilter]);

  function onSyncAll() {
    startSyncAll(async () => {
      const res = await syncAll();
      setFlash(res.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <NBCard className="bg-white">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <NBInput
            placeholder="Search username, MAC, name, email, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <NBSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
            <option value="expiring">Expiring ≤7d</option>
            <option value="unknown">Unknown</option>
          </NBSelect>
          <NBSelect
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          >
            <option value="all">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </NBSelect>
          <NBButton color="cyan" onClick={onSyncAll} disabled={syncingAll}>
            {syncingAll ? "Syncing…" : "📡 Sync all"}
          </NBButton>
        </div>
        {flash && <p className="mt-2 text-sm font-bold">{flash}</p>}
      </NBCard>

      <p className="text-sm text-ink/60">
        Showing {filtered.length} of {rows.length}.
      </p>

      <div className="space-y-3">
        {filtered.map((r) => (
          <ClientCard
            key={r.id}
            row={r}
            onFlash={setFlash}
            templates={templates}
            emailReady={emailReady}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

function ClientCard({
  row,
  onFlash,
  templates,
  emailReady,
  isAdmin,
}: {
  row: ClientRow;
  onFlash: (m: string) => void;
  templates: MsgTemplate[];
  emailReady: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [renewSub, setRenewSub] = useState(row.renewSubs[0] ?? 1);

  const hasContact =
    row.customerName || row.customerEmail || row.customerPhone;

  async function onSaveDetails(formData: FormData) {
    setBusy(true);
    const res = await updateClientDetails(null, formData);
    onFlash(res.message);
    setBusy(false);
    if (res.ok) setEditOpen(false);
    router.refresh();
  }

  async function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true);
    const res = await fn();
    onFlash(res.message);
    setBusy(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Remove this client from the dashboard? (does not touch the panel)"))
      return;
    setBusy(true);
    await deleteClient(row.id);
    router.refresh();
  }

  return (
    <NBCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">
              {row.username ?? row.mac ?? "—"}
            </span>
            <NBBadge color="blue">{row.type.toUpperCase()}</NBBadge>
            <NBBadge color={STATUS_COLOR[row.status]}>{row.status}</NBBadge>
            {row.source === "imported" && (
              <NBBadge color="white">imported</NBBadge>
            )}
          </div>
          <p className="mt-1 text-xs text-ink/60">
            {row.providerName}
            {row.expireDate && ` · expires ${row.expireDate}`}
            {row.days != null &&
              row.days >= 0 &&
              row.days <= 7 &&
              ` (${row.days}d left)`}
            {row.note && ` · ${row.note}`}
          </p>

          {hasContact && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {row.customerName && (
                <span className="nb-badge bg-purple">👤 {row.customerName}</span>
              )}
              {row.customerEmail && (
                <a
                  href={`mailto:${row.customerEmail}`}
                  className="nb-badge bg-white hover:bg-blue"
                >
                  ✉️ {row.customerEmail}
                </a>
              )}
              {row.customerPhone && (
                <a
                  href={`tel:${row.customerPhone}`}
                  className="nb-badge bg-white hover:bg-lime"
                >
                  📞 {row.customerPhone}
                </a>
              )}
            </div>
          )}

          {row.lastSyncedAt && (
            <p className="mt-1 text-xs text-ink/40">
              synced {new Date(row.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <NBButton
            color="cyan"
            onClick={() => run(() => syncClient(row.id))}
            disabled={busy}
          >
            📡 Sync
          </NBButton>
          {isAdmin && (
            <NBButton color="yellow" onClick={() => setRenewOpen((v) => !v)}>
              🔄 Renew
            </NBButton>
          )}
          <NBButton color="pink" onClick={() => setMsgOpen((v) => !v)}>
            ✉️ Message
          </NBButton>
          <NBButton onClick={() => setEditOpen((v) => !v)}>✏️ Edit</NBButton>
          {isAdmin && (
            <NBButton color="red" onClick={onDelete} disabled={busy}>
              🗑
            </NBButton>
          )}
        </div>
      </div>

      {editOpen && (
        <form
          action={onSaveDetails}
          className="mt-3 space-y-3 rounded-lg border-2 border-dashed border-ink p-3"
        >
          <input type="hidden" name="id" value={row.id} />
          <p className="text-sm font-bold">👤 Customer details</p>
          <div>
            <NBLabel>Name</NBLabel>
            <NBInput name="customerName" defaultValue={row.customerName ?? ""} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <NBLabel>Email</NBLabel>
              <NBInput
                name="customerEmail"
                type="email"
                defaultValue={row.customerEmail ?? ""}
              />
            </div>
            <div>
              <NBLabel>Phone</NBLabel>
              <NBInput
                name="customerPhone"
                type="tel"
                defaultValue={row.customerPhone ?? ""}
              />
            </div>
          </div>
          <div>
            <NBLabel>Note</NBLabel>
            <NBInput name="note" defaultValue={row.note ?? ""} />
          </div>
          <div className="flex gap-2">
            <NBButton type="submit" color="lime" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </NBButton>
            <NBButton type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </NBButton>
          </div>
        </form>
      )}

      {renewOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border-2 border-dashed border-ink p-3">
          <div>
            <label className="nb-label">Renew for</label>
            <NBSelect
              value={renewSub}
              onChange={(e) => setRenewSub(Number(e.target.value))}
              className="w-40"
            >
              {row.renewSubs.map((s) => (
                <option key={s} value={s}>
                  {s} month{s === 1 ? "" : "s"}
                </option>
              ))}
            </NBSelect>
          </div>
          <NBButton
            color="lime"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const res = await renewClient(row.id, renewSub);
                if (res.ok) setRenewOpen(false);
                return res;
              })
            }
          >
            {busy ? "Renewing…" : "Confirm renew (spends credits)"}
          </NBButton>
        </div>
      )}

      {msgOpen && (
        <MessagePanel
          row={row}
          templates={templates}
          emailReady={emailReady}
          onFlash={onFlash}
        />
      )}
    </NBCard>
  );
}

function MessagePanel({
  row,
  templates,
  emailReady,
  onFlash,
}: {
  row: ClientRow;
  templates: MsgTemplate[];
  emailReady: boolean;
  onFlash: (m: string) => void;
}) {
  const [key, setKey] = useState(templates[0]?.key ?? "");
  const [sending, setSending] = useState(false);
  const tpl = templates.find((t) => t.key === key);

  const subject = tpl ? applyVars(tpl.subject, row.vars) : "";
  const bodyText = tpl ? applyVars(tpl.body, row.vars) : "";
  const wa = row.customerPhone ? waLink(row.customerPhone, bodyText) : null;

  async function onSendEmail() {
    setSending(true);
    const res = await sendClientEmail(row.id, key);
    onFlash(res.message);
    setSending(false);
  }

  async function onCopy() {
    await navigator.clipboard.writeText(bodyText);
    onFlash("Message copied to clipboard.");
  }

  if (templates.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink/60">
        No templates yet — add them on the Messages page.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border-2 border-dashed border-ink p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">✉️ Send a message</span>
        <NBSelect
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-auto"
        >
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </NBSelect>
      </div>

      <div className="rounded-lg border-2 border-ink bg-white p-3">
        {subject && (
          <p className="mb-1 border-b border-dashed border-ink/30 pb-1 text-sm font-bold">
            {subject}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{bodyText}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <NBButton
          color="cyan"
          onClick={onSendEmail}
          disabled={sending || !row.customerEmail || !emailReady}
          title={
            !row.customerEmail
              ? "No email on file"
              : !emailReady
                ? "Configure SMTP in Settings"
                : ""
          }
        >
          {sending ? "Sending…" : "📧 Send email"}
        </NBButton>
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="nb-btn bg-lime">
            🟢 WhatsApp
          </a>
        ) : (
          <NBButton disabled title="No phone on file">
            🟢 WhatsApp
          </NBButton>
        )}
        <NBButton onClick={onCopy}>📋 Copy</NBButton>
      </div>

      {(!row.customerEmail || !emailReady) && (
        <p className="text-xs text-ink/60">
          {!row.customerEmail && "Add an email (Edit) to send by email. "}
          {!emailReady && "Configure SMTP in Settings to enable email."}
        </p>
      )}
    </div>
  );
}
