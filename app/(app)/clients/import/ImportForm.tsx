"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NBButton, NBCard, NBInput, NBLabel, NBSelect } from "@/components/ui";
import { CustomerFields } from "@/components/CustomerFields";
import { importClient } from "@/lib/actions/clients";

type ClientType = "m3u" | "mag" | "protocol";

export type ImportProviderOption = {
  id: number;
  name: string;
  supportedTypes: ClientType[];
};

type Prefill = {
  orderId: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  plan?: string;
  orderDate?: string;
};

export function ImportForm({
  providers,
  prefill,
}: {
  providers: ImportProviderOption[];
  prefill?: Prefill;
}) {
  const router = useRouter();
  const [providerId, setProviderId] = useState(providers[0].id);
  const provider = providers.find((p) => p.id === providerId)!;
  const [type, setType] = useState<ClientType>(provider.supportedTypes[0]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setResult(null);
    const res = await importClient(null, formData);
    setResult(res);
    setBusy(false);
    if (res.ok) setTimeout(() => router.push("/clients"), 800);
  }

  return (
    <form action={onSubmit}>
      <NBCard className="max-w-xl bg-blue/30">
        <input type="hidden" name="type" value={type} />
        {prefill && (
          <>
            <input type="hidden" name="orderId" value={prefill.orderId} />
            <input type="hidden" name="plan" value={prefill.plan ?? ""} />
            <input type="hidden" name="orderDate" value={prefill.orderDate ?? ""} />
          </>
        )}

        <div className="mb-4">
          <NBLabel>Provider</NBLabel>
          <NBSelect
            name="providerId"
            value={providerId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setProviderId(id);
              const p = providers.find((x) => x.id === id)!;
              setType(p.supportedTypes[0]);
            }}
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
                onClick={() => setType(t)}
                className={`nb-btn flex-1 ${type === t ? "bg-pink" : "bg-white"}`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {type === "mag" ? (
          <div className="mb-4">
            <NBLabel>MAC address</NBLabel>
            <NBInput name="mac" placeholder="00:1A:79:xx:xx:xx" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <NBLabel>Username</NBLabel>
              <NBInput name="username" placeholder="line username" />
            </div>
            <div className="mb-4">
              <NBLabel>Password</NBLabel>
              <NBInput name="password" placeholder="line password" />
            </div>
          </>
        )}

        <div className="mb-4">
          <NBLabel>Expiry date (optional)</NBLabel>
          <NBInput name="expireDate" type="date" />
        </div>

        <div className="mb-4 rounded-lg border-2 border-dashed border-ink p-3">
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
            defaultValue={prefill?.note ?? ""}
          />
        </div>

        {result && (
          <p
            className={`mb-3 rounded-md border-2 border-ink px-3 py-2 text-sm font-bold ${
              result.ok ? "bg-lime" : "bg-red text-white"
            }`}
          >
            {result.message}
          </p>
        )}

        <p className="mb-3 text-xs text-ink/60">
          Tip: after importing, hit <strong>Sync</strong> on the client to pull
          its real expiry and status from the panel.
        </p>

        <NBButton type="submit" color="lime" disabled={busy}>
          {busy ? "Importing…" : "Import client (free)"}
        </NBButton>
      </NBCard>
    </form>
  );
}
