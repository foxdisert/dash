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
import { useToast } from "@/components/Toast";

export type ClientRow = {
  id: number;
  providerName: string;
  type: string;
  username: string | null;
  mac: string | null;
  expireDate: string | null;
  days: number | null;
  status: "active" | "expired" | "disabled" | "pending" | "unknown";
  source: string;
  note: string | null;
  plan: string | null;
  orderDate: string | null;
  assignedAgentId: number | null;
  ownerName: string | null;
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

const STATUS_COLOR: Record<
  ClientRow["status"],
  "lime" | "red" | "yellow" | "white" | "blue"
> = {
  active: "lime",
  expired: "red",
  disabled: "red",
  pending: "blue",
  unknown: "yellow",
};

export function ClientsTable({
  rows,
  providers,
  templates,
  emailReady,
  isAdmin,
  agents,
}: {
  rows: ClientRow[];
  providers: { id: number; name: string }[];
  templates: MsgTemplate[];
  emailReady: boolean;
  isAdmin: boolean;
  agents: { id: number; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    params.get("filter") === "expiring" ? "exp7" : "all",
  );
  const [providerFilter, setProviderFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [syncingAll, startSyncAll] = useTransition();
  const toast = useToast();

  // Distinct plans present, for the plan dropdown.
  const planOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.plan).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const out = rows.filter((r) => {
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        (r.username ?? "").toLowerCase().includes(q) ||
        (r.mac ?? "").toLowerCase().includes(q) ||
        (r.note ?? "").toLowerCase().includes(q) ||
        (r.plan ?? "").toLowerCase().includes(q) ||
        (r.customerName ?? "").toLowerCase().includes(q) ||
        (r.customerEmail ?? "").toLowerCase().includes(q) ||
        (r.customerPhone ?? "").toLowerCase().includes(q);
      const matchProvider =
        providerFilter === "all" || r.providerName === providerFilter;
      const matchPlan = planFilter === "all" || r.plan === planFilter;

      let matchStatus = true;
      if (statusFilter === "exp7")
        matchStatus = r.days != null && r.days >= 0 && r.days <= 7;
      else if (statusFilter === "exp30")
        matchStatus = r.days != null && r.days >= 0 && r.days <= 30;
      else if (statusFilter !== "all") matchStatus = r.status === statusFilter;

      const od = r.orderDate ?? "";
      const matchFrom = !fromDate || (od && od >= fromDate);
      const matchTo = !toDate || (od && od <= toDate);

      return matchQ && matchProvider && matchPlan && matchStatus && matchFrom && matchTo;
    });

    out.sort((a, b) => {
      if (sortBy === "expiry")
        return (a.days ?? 9e9) - (b.days ?? 9e9); // soonest expiry first
      if (sortBy === "order")
        return (b.orderDate ?? "").localeCompare(a.orderDate ?? ""); // newest order first
      return b.id - a.id; // recent added
    });
    return out;
  }, [rows, query, statusFilter, providerFilter, planFilter, fromDate, toDate, sortBy]);

  function onSyncAll() {
    startSyncAll(async () => {
      const res = await syncAll();
      toast.result(res);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <NBCard className="bg-white">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <NBInput
            placeholder="Search username, name, email, phone, plan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:col-span-2 lg:col-span-2"
          />
          <NBSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">🔧 Pending setup</option>
            <option value="active">Active</option>
            <option value="exp7">⏳ Expiring ≤ 7 days</option>
            <option value="exp30">⏳ Expiring ≤ 30 days</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
            <option value="unknown">Unknown</option>
          </NBSelect>
          <NBSelect
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="all">All plans</option>
            {planOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
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
          <div>
            <NBLabel>Ordered from</NBLabel>
            <NBInput
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <NBLabel>Ordered to</NBLabel>
            <NBInput
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <NBSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Sort: recently added</option>
            <option value="expiry">Sort: expiry (soonest)</option>
            <option value="order">Sort: order date (newest)</option>
          </NBSelect>
          <NBButton color="cyan" onClick={onSyncAll} disabled={syncingAll}>
            {syncingAll ? "Syncing…" : "📡 Sync all"}
          </NBButton>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm text-ink/60">
            Showing {filtered.length} of {rows.length}.
          </p>
          {(query ||
            statusFilter !== "all" ||
            planFilter !== "all" ||
            providerFilter !== "all" ||
            fromDate ||
            toDate) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setPlanFilter("all");
                setProviderFilter("all");
                setFromDate("");
                setToDate("");
              }}
              className="text-sm font-bold underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </NBCard>

      <div className="space-y-3">
        {filtered.map((r) => (
          <ClientCard
            key={r.id}
            row={r}
            templates={templates}
            emailReady={emailReady}
            isAdmin={isAdmin}
            agents={agents}
          />
        ))}
      </div>
    </div>
  );
}

function ClientCard({
  row,
  templates,
  emailReady,
  isAdmin,
  agents,
}: {
  row: ClientRow;
  templates: MsgTemplate[];
  emailReady: boolean;
  isAdmin: boolean;
  agents: { id: number; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
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
    toast.result(res);
    setBusy(false);
    if (res.ok) setEditOpen(false);
    router.refresh();
  }

  async function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true);
    const res = await fn();
    toast.result(res);
    setBusy(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Remove this client from the dashboard? (does not touch the panel)"))
      return;
    setBusy(true);
    try {
      await deleteClient(row.id);
      toast.success("Client deleted.");
    } catch {
      toast.error("Couldn't delete this client.");
    }
    router.refresh();
  }

  return (
    <NBCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">
              {row.username ?? row.mac ?? row.customerName ?? "—"}
            </span>
            <NBBadge color="blue">{row.type.toUpperCase()}</NBBadge>
            <NBBadge color={STATUS_COLOR[row.status]}>{row.status}</NBBadge>
            {row.plan && <span className="nb-badge bg-purple">{row.plan}</span>}
            {row.source === "imported" && (
              <NBBadge color="white">imported</NBBadge>
            )}
          </div>
          <p className="mt-1 text-xs text-ink/60">
            {row.providerName}
            {row.expireDate && ` · expires ${row.expireDate}`}
            {row.days != null &&
              row.days >= 0 &&
              row.days <= 30 &&
              ` (${row.days}d left)`}
            {row.orderDate && ` · ordered ${row.orderDate}`}
            {row.ownerName && ` · 👤 ${row.ownerName}`}
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
          {isAdmin && agents.length > 0 && (
            <div>
              <NBLabel>Assigned agent (owner)</NBLabel>
              <NBSelect
                name="assignedAgentId"
                defaultValue={row.assignedAgentId ?? ""}
              >
                <option value="">— unassigned —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NBSelect>
            </div>
          )}
          {isAdmin && (
            <div className="rounded-lg border-2 border-ink bg-white p-3">
              <p className="mb-2 text-sm font-bold">
                🔑 Line setup {row.status === "pending" && "(pending)"}
              </p>
              {row.type === "mag" ? (
                <NBInput name="mac" defaultValue={row.mac ?? ""} placeholder="MAC address" />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <NBInput name="username" defaultValue={row.username ?? ""} placeholder="username" />
                  <NBInput name="password" type="text" placeholder="password (blank = keep)" />
                </div>
              )}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <NBLabel>Expiry</NBLabel>
                  <NBInput name="expireDate" type="date" defaultValue={row.expireDate ?? ""} />
                </div>
                <div>
                  <NBLabel>Status</NBLabel>
                  <NBSelect
                    name="status"
                    defaultValue={
                      row.status === "pending"
                        ? "pending"
                        : row.status === "disabled"
                          ? "disabled"
                          : "active"
                    }
                  >
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </NBSelect>
                </div>
              </div>
            </div>
          )}
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
        <MessagePanel row={row} templates={templates} emailReady={emailReady} />
      )}
    </NBCard>
  );
}

function MessagePanel({
  row,
  templates,
  emailReady,
}: {
  row: ClientRow;
  templates: MsgTemplate[];
  emailReady: boolean;
}) {
  const toast = useToast();
  const [key, setKey] = useState(templates[0]?.key ?? "");
  const [sending, setSending] = useState(false);
  const tpl = templates.find((t) => t.key === key);

  const subject = tpl ? applyVars(tpl.subject, row.vars) : "";
  const bodyText = tpl ? applyVars(tpl.body, row.vars) : "";
  const wa = row.customerPhone ? waLink(row.customerPhone, bodyText) : null;

  async function onSendEmail() {
    setSending(true);
    const res = await sendClientEmail(row.id, key);
    toast.result(res);
    setSending(false);
  }

  async function onCopy() {
    await navigator.clipboard.writeText(bodyText);
    toast.success("Message copied to clipboard.");
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
