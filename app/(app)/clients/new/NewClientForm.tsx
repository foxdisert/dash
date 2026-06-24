"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NBBadge,
  NBButton,
  NBCard,
  NBInput,
  NBLabel,
  NBSelect,
} from "@/components/ui";
import { CustomerFields } from "@/components/CustomerFields";
import { createClient } from "@/lib/actions/clients";
import { useToast } from "@/components/Toast";

type ClientType = "m3u" | "mag" | "protocol";

export type ProviderOption = {
  id: number;
  name: string;
  supportedTypes: ClientType[];
  subOptions: Record<ClientType, number[]>;
  bouquets: { id: string; name: string }[];
};

function subLabel(s: number): string {
  return s === 99 ? "Demo (1 ticket)" : `${s} month${s === 1 ? "" : "s"}`;
}

export type Prefill = {
  orderId: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  plan?: string;
  orderDate?: string;
  sub?: number;
};

export function NewClientForm({
  providers,
  prefill,
}: {
  providers: ProviderOption[];
  prefill?: Prefill;
}) {
  const router = useRouter();
  const toast = useToast();
  const [providerId, setProviderId] = useState(providers[0].id);
  const provider = providers.find((p) => p.id === providerId)!;

  const [type, setType] = useState<ClientType>(provider.supportedTypes[0]);
  const initialSub =
    prefill?.sub && provider.subOptions[provider.supportedTypes[0]].includes(prefill.sub)
      ? prefill.sub
      : provider.subOptions[provider.supportedTypes[0]][0];
  const [sub, setSub] = useState<number>(initialSub);
  const [mac, setMac] = useState("");
  const [note, setNote] = useState(prefill?.note ?? "");
  const [allPacks, setAllPacks] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const subs = provider.subOptions[type] ?? [1, 3, 6, 12];

  function onProviderChange(id: number) {
    setProviderId(id);
    const p = providers.find((x) => x.id === id)!;
    const t = p.supportedTypes[0];
    setType(t);
    setSub(p.subOptions[t][0]);
    setPicked(new Set());
    setAllPacks(true);
  }

  function onTypeChange(t: ClientType) {
    setType(t);
    setSub(provider.subOptions[t][0]);
  }

  function togglePack(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filteredBouquets = useMemo(
    () =>
      provider.bouquets.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.id.includes(search),
      ),
    [provider.bouquets, search],
  );

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setResult(null);
    // Inject pack selections.
    if (allPacks) formData.append("pack", "all");
    else picked.forEach((id) => formData.append("pack", id));

    const res = await createClient(null, formData);
    setResult(res);
    toast.result(res);
    setBusy(false);
    if (res.ok) {
      setTimeout(() => router.push("/clients"), 900);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="providerId" value={providerId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="sub" value={sub} />
      {prefill && (
        <>
          <input type="hidden" name="orderId" value={prefill.orderId} />
          <input type="hidden" name="plan" value={prefill.plan ?? ""} />
          <input type="hidden" name="orderDate" value={prefill.orderDate ?? ""} />
        </>
      )}

      <NBCard className="bg-yellow">
        <h2 className="mb-4 text-xl font-bold">Details</h2>

        <div className="mb-4">
          <NBLabel>Provider</NBLabel>
          <NBSelect
            value={providerId}
            onChange={(e) => onProviderChange(Number(e.target.value))}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NBSelect>
        </div>

        <div className="mb-4">
          <NBLabel>Type</NBLabel>
          <div className="flex gap-2">
            {provider.supportedTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTypeChange(t)}
                className={`nb-btn flex-1 ${type === t ? "bg-pink" : "bg-white"}`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {type === "mag" && (
          <div className="mb-4">
            <NBLabel>MAC address</NBLabel>
            <NBInput
              name="mac"
              placeholder="00:1A:79:xx:xx:xx"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
            />
          </div>
        )}

        <div className="mb-4">
          <NBLabel>Subscription length</NBLabel>
          <NBSelect value={sub} onChange={(e) => setSub(Number(e.target.value))}>
            {subs.map((s) => (
              <option key={s} value={s}>
                {subLabel(s)}
              </option>
            ))}
          </NBSelect>
          {sub === 99 && (
            <p className="mt-2 rounded-md border-2 border-ink bg-white px-3 py-2 text-xs font-bold">
              Demo lines use <strong>1 Demo Ticket</strong> (a separate pool from
              your credits). If you see “Not enough Demo Tickets”, your panel
              account is out of demo tickets — ask your provider to top them up.
            </p>
          )}
        </div>

        <div className="mb-4 rounded-lg border-2 border-dashed border-ink bg-white/40 p-3">
          <p className="mb-3 text-sm font-bold">👤 Customer details (optional)</p>
          <CustomerFields
            defaults={
              prefill
                ? { name: prefill.name, email: prefill.email, phone: prefill.phone }
                : undefined
            }
          />
        </div>

        <div className="mb-4">
          <NBLabel>Note (optional)</NBLabel>
          <NBInput
            name="note"
            placeholder="Anything else…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {result && (
          <p
            className={`rounded-md border-2 border-ink px-3 py-2 text-sm font-bold ${
              result.ok ? "bg-lime" : "bg-red text-white"
            }`}
          >
            {result.message}
          </p>
        )}

        <NBButton type="submit" color="lime" className="mt-2 w-full" disabled={busy}>
          {busy
            ? "Creating…"
            : sub === 99
              ? "Create demo ⚡ (uses 1 demo ticket)"
              : "Create line ⚡ (spends credits)"}
        </NBButton>
      </NBCard>

      <NBCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Packages</h2>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={allPacks}
              onChange={(e) => setAllPacks(e.target.checked)}
              className="size-4"
            />
            All bouquets
          </label>
        </div>

        {allPacks ? (
          <p className="text-sm text-ink/60">
            This line will include <strong>all</strong> bouquets. Uncheck to pick
            specific ones.
          </p>
        ) : provider.bouquets.length === 0 ? (
          <p className="text-sm text-ink/60">
            No bouquets cached. Refresh them on the{" "}
            <a href="/bouquets" className="underline">
              Bouquets
            </a>{" "}
            page first.
          </p>
        ) : (
          <>
            <NBInput
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />
            <p className="mb-2 text-xs text-ink/60">{picked.size} selected</p>
            <div className="flex max-h-72 flex-wrap gap-2 overflow-auto">
              {filteredBouquets.map((b) => {
                const on = picked.has(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => togglePack(b.id)}
                  >
                    <NBBadge color={on ? "lime" : "white"}>
                      <span className="text-ink/50">#{b.id}</span> {b.name}
                    </NBBadge>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </NBCard>
    </form>
  );
}
