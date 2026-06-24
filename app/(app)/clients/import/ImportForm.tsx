"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NBButton, NBCard, NBInput, NBLabel, NBSelect } from "@/components/ui";
import { CustomerFields } from "@/components/CustomerFields";
import { importClient } from "@/lib/actions/clients";
import { useToast } from "@/components/Toast";

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
  isAdmin,
  planOptions,
}: {
  providers: ImportProviderOption[];
  prefill?: Prefill;
  isAdmin: boolean;
  planOptions: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [providerId, setProviderId] = useState(providers[0].id);
  const provider = providers.find((p) => p.id === providerId)!;
  const [type, setType] = useState<ClientType>(provider.supportedTypes[0]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  // Plan: dropdown of known plans + free-text fallback.
  const initialPlan = prefill?.plan ?? "";
  const [plan, setPlan] = useState(initialPlan);
  const [planOther, setPlanOther] = useState(
    Boolean(initialPlan) && !planOptions.includes(initialPlan),
  );

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setResult(null);
    const res = await importClient(null, formData);
    setResult(res);
    toast.result(res);
    setBusy(false);
    if (res.ok) setTimeout(() => router.push("/clients"), 800);
  }

  return (
    <form action={onSubmit}>
      <NBCard className="max-w-xl bg-blue/30">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="plan" value={plan} />
        {prefill && (
          <>
            <input type="hidden" name="orderId" value={prefill.orderId} />
            <input type="hidden" name="orderDate" value={prefill.orderDate ?? ""} />
          </>
        )}

        {providers.length > 1 && (
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
        )}
        {providers.length <= 1 && (
          <input type="hidden" name="providerId" value={providerId} />
        )}

        {/* Plan (both roles) */}
        <div className="mb-4">
          <NBLabel>Plan</NBLabel>
          {!planOther ? (
            <NBSelect
              value={plan}
              onChange={(e) => {
                if (e.target.value === "__other__") {
                  setPlanOther(true);
                  setPlan("");
                } else setPlan(e.target.value);
              }}
            >
              <option value="">— choose a plan —</option>
              {planOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="__other__">Other (type it)…</option>
            </NBSelect>
          ) : (
            <div className="flex gap-2">
              <NBInput
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="e.g. 6 Months Premium"
              />
              <NBButton
                type="button"
                onClick={() => {
                  setPlanOther(false);
                  setPlan("");
                }}
              >
                List
              </NBButton>
            </div>
          )}
        </div>

        {/* Line credentials — ADMIN ONLY (these come from the provider panel) */}
        {isAdmin && (
          <div className="mb-4 rounded-lg border-2 border-dashed border-ink p-3">
            <p className="mb-3 text-sm font-bold">
              🔑 Line credentials (optional — leave blank to mark “pending setup”)
            </p>
            <div className="mb-3">
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
              <div className="mb-3">
                <NBLabel>MAC address</NBLabel>
                <NBInput name="mac" placeholder="00:1A:79:xx:xx:xx" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <NBLabel>Username</NBLabel>
                  <NBInput name="username" placeholder="line username" />
                </div>
                <div>
                  <NBLabel>Password</NBLabel>
                  <NBInput name="password" placeholder="line password" />
                </div>
              </div>
            )}
            <div className="mt-3">
              <NBLabel>Expiry date (optional)</NBLabel>
              <NBInput name="expireDate" type="date" />
            </div>
          </div>
        )}

        {/* Customer details */}
        <div className="mb-4 rounded-lg border-2 border-dashed border-ink p-3">
          <p className="mb-3 text-sm font-bold">👤 Customer details</p>
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
            placeholder="Device, anything else…"
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

        {!isAdmin && (
          <p className="mb-3 text-xs text-ink/60">
            The admin will set up the actual line (username/password) on the panel
            and activate it. You don’t need those details.
          </p>
        )}

        <NBButton type="submit" color="lime" disabled={busy}>
          {busy ? "Saving…" : isAdmin ? "Save client (free)" : "Add customer"}
        </NBButton>
      </NBCard>
    </form>
  );
}
