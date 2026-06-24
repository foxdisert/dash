"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  NBBadge,
  NBButton,
  NBCard,
  NBInput,
  NBLabel,
  NBSelect,
} from "@/components/ui";
import type { ProviderKindMeta } from "@/lib/providers/types";
import {
  createProvider,
  deleteProvider,
  testProvider,
  testProviderConfig,
  updateProvider,
} from "@/lib/actions/providers";
import { useToast } from "@/components/Toast";

type Row = {
  id: number;
  name: string;
  kind: string;
  baseUrl: string;
  host: string;
  enabled: boolean;
};

export function ProvidersClient({
  providers,
  kinds,
}: {
  providers: Row[];
  kinds: ProviderKindMeta[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AddProviderForm kinds={kinds} />
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Connected ({providers.length})</h2>
        {providers.length === 0 && (
          <NBCard className="bg-blue/40">
            <p className="font-bold">No providers yet.</p>
            <p className="text-sm">Add your Dino panel on the left to begin.</p>
          </NBCard>
        )}
        {providers.map((p) => (
          <ProviderRow key={p.id} row={p} kinds={kinds} />
        ))}
      </div>
    </div>
  );
}

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

function AddProviderForm({ kinds }: { kinds: ProviderKindMeta[] }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState(kinds[0]?.kind ?? "");
  const [baseUrl, setBaseUrl] = useState(kinds[0]?.defaultBaseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState(false);

  const meta = kinds.find((k) => k.kind === kind);

  function onKindChange(v: string) {
    setKind(v);
    const m = kinds.find((k) => k.kind === v);
    if (m) setBaseUrl(m.defaultBaseUrl);
  }

  async function onTest() {
    setTesting(true);
    const res = await testProviderConfig(kind, baseUrl, apiKey);
    setMsg(res);
    toast.result(res);
    setTesting(false);
  }

  function onSave(formData: FormData) {
    start(async () => {
      const res = await createProvider(null, formData);
      setMsg(res);
      toast.result(res);
      if (res.ok) {
        setApiKey("");
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <NBCard className="bg-yellow">
      <h2 className="mb-4 text-xl font-bold">➕ Add a provider</h2>
      <form action={onSave} className="space-y-3">
        <div>
          <NBLabel>Type</NBLabel>
          <NBSelect
            name="kind"
            value={kind}
            onChange={(e) => onKindChange(e.target.value)}
          >
            {kinds.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </NBSelect>
        </div>
        <div>
          <NBLabel>Name</NBLabel>
          <NBInput
            name="name"
            placeholder="e.g. Dino main"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <NBLabel>Base URL</NBLabel>
          <NBInput
            name="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        <div>
          <NBLabel>API key</NBLabel>
          <NBInput
            name="apiKey"
            type="password"
            placeholder="reseller api key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div>
          <NBLabel>M3U / Xtream host domain(s)</NBLabel>
          <textarea
            name="host"
            rows={2}
            placeholder="letsdream8k.store&#10;alt-domain.com:8080"
            className="w-full rounded-lg border-[3px] border-ink bg-white px-3 py-2 font-medium outline-none focus:shadow-[4px_4px_0_0_#131313]"
          />
          <p className="mt-1 text-xs text-ink/60">
            Host(s) used in this provider’s M3U/Xtream links — one per line, the
            first is the default. Needed for panels (like Dino) that return links
            without a host.
          </p>
        </div>

        {meta && (
          <p className="text-xs text-ink/60">
            Supports: {meta.supportedTypes.join(", ")}.
          </p>
        )}

        <Flash msg={msg} />

        <div className="flex gap-2">
          <NBButton
            type="button"
            color="white"
            onClick={onTest}
            disabled={testing || !apiKey}
          >
            {testing ? "Testing…" : "Test connection"}
          </NBButton>
          <NBButton type="submit" color="lime" disabled={pending || !apiKey || !name}>
            {pending ? "Saving…" : "Save provider"}
          </NBButton>
        </div>
      </form>
    </NBCard>
  );
}

function ProviderRow({ row, kinds }: { row: Row; kinds: ProviderKindMeta[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const meta = kinds.find((k) => k.kind === row.kind);

  async function onTest() {
    setBusy(true);
    const res = await testProvider(row.id);
    setMsg(res);
    toast.result(res);
    setBusy(false);
  }

  async function onDelete() {
    if (!confirm(`Delete provider “${row.name}” and all its clients?`)) return;
    setBusy(true);
    await deleteProvider(row.id);
    toast.success(`Deleted “${row.name}”.`);
    router.refresh();
  }

  async function onSaveEdit(formData: FormData) {
    setBusy(true);
    const res = await updateProvider(null, formData);
    setMsg(res);
    toast.result(res);
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  return (
    <NBCard>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{row.name}</p>
          <p className="text-xs text-ink/60">
            {meta?.label ?? row.kind} · {row.baseUrl}
          </p>
        </div>
        <NBBadge color={row.enabled ? "lime" : "red"}>
          {row.enabled ? "enabled" : "disabled"}
        </NBBadge>
      </div>

      {editing ? (
        <form action={onSaveEdit} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={row.id} />
          <NBLabel>Name</NBLabel>
          <NBInput name="name" defaultValue={row.name} />
          <NBLabel>Base URL</NBLabel>
          <NBInput name="baseUrl" defaultValue={row.baseUrl} />
          <NBLabel>M3U / Xtream host domain(s) — one per line</NBLabel>
          <textarea
            name="host"
            defaultValue={row.host}
            rows={2}
            placeholder="letsdream8k.store"
            className="w-full rounded-lg border-[3px] border-ink bg-white px-3 py-2 font-medium outline-none focus:shadow-[4px_4px_0_0_#131313]"
          />
          <NBLabel>API key</NBLabel>
          <NBInput
            name="apiKey"
            type="password"
            placeholder="leave blank to keep current key"
          />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={row.enabled}
              className="size-4"
            />
            Enabled
          </label>
          <div className="flex gap-2">
            <NBButton type="submit" color="lime" disabled={busy}>
              Save
            </NBButton>
            <NBButton type="button" onClick={() => setEditing(false)}>
              Cancel
            </NBButton>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <NBButton color="cyan" onClick={onTest} disabled={busy}>
            {busy ? "…" : "Test"}
          </NBButton>
          <NBButton onClick={() => setEditing(true)}>Edit</NBButton>
          <NBButton color="red" onClick={onDelete} disabled={busy}>
            Delete
          </NBButton>
        </div>
      )}

      <div className="mt-2">
        <Flash msg={msg} />
      </div>
    </NBCard>
  );
}
