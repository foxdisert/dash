"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NBBadge, NBButton, NBCard, NBInput } from "@/components/ui";
import { refreshBouquets } from "@/lib/actions/bouquets";
import { useToast } from "@/components/Toast";

type ProviderBouquets = {
  id: number;
  name: string;
  enabled: boolean;
  bouquets: { id: string; name: string }[];
};

export function BouquetsClient({
  providers,
}: {
  providers: ProviderBouquets[];
}) {
  if (providers.length === 0) {
    return (
      <NBCard className="bg-blue/40">
        <p className="font-bold">No providers connected.</p>
        <Link href="/providers" className="nb-btn mt-2 bg-cyan text-white">
          Add a provider
        </Link>
      </NBCard>
    );
  }

  return (
    <div className="space-y-6">
      {providers.map((p) => (
        <ProviderBouquetCard key={p.id} provider={p} />
      ))}
    </div>
  );
}

function ProviderBouquetCard({ provider }: { provider: ProviderBouquets }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function onRefresh() {
    setBusy(true);
    setMsg(null);
    const res = await refreshBouquets(provider.id);
    setMsg(res.message);
    toast.result(res);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const filtered = provider.bouquets.filter(
    (b) =>
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.id.includes(query),
  );

  return (
    <NBCard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{provider.name}</h2>
          <p className="text-xs text-ink/60">
            {provider.bouquets.length} bouquets cached
          </p>
        </div>
        <NBButton color="cyan" onClick={onRefresh} disabled={busy}>
          {busy ? "Loading…" : "🔄 Refresh"}
        </NBButton>
      </div>

      {msg && <p className="mb-2 text-sm font-bold">{msg}</p>}

      {provider.bouquets.length === 0 ? (
        <p className="text-sm text-ink/60">
          No bouquets cached yet — hit refresh.
        </p>
      ) : (
        <>
          <NBInput
            placeholder="Search bouquets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3"
          />
          <div className="flex max-h-80 flex-wrap gap-2 overflow-auto">
            {filtered.map((b) => (
              <NBBadge key={b.id} color="white" className="bg-paper">
                <span className="text-ink/50">#{b.id}</span> {b.name}
              </NBBadge>
            ))}
          </div>
        </>
      )}
    </NBCard>
  );
}
