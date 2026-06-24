import Link from "next/link";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { getProviderKindMeta } from "@/lib/providers/registry";
import { NBCard } from "@/components/ui";
import { getOrder } from "@/lib/queries";
import { orderPrefill } from "@/lib/orders";
import { ImportForm, type ImportProviderOption } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const order = orderId ? getOrder(Number(orderId)) : undefined;
  const prefill = order ? orderPrefill(order) : undefined;
  const provs = db.select().from(providers).all();
  const options: ImportProviderOption[] = provs.map((p) => ({
    id: p.id,
    name: p.name,
    supportedTypes: getProviderKindMeta(p.kind)?.supportedTypes ?? ["m3u"],
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📥 Import existing client</h1>
          <p className="text-sm text-ink/70">
            Add a line you already sold. This <strong>does not</strong> spend
            credits — it just starts tracking it.
          </p>
        </div>
        <Link href="/clients" className="nb-btn">
          ← Back
        </Link>
      </header>

      {order && (
        <NBCard className="bg-lime/40">
          <p className="text-sm font-bold">
            🛒 Converting order #{order.externalId ?? order.id} — details
            pre-filled below.
          </p>
        </NBCard>
      )}

      {options.length === 0 ? (
        <NBCard className="bg-yellow">
          <p className="font-bold">No providers yet.</p>
          <Link href="/providers" className="nb-btn mt-2 bg-cyan text-white">
            Add a provider
          </Link>
        </NBCard>
      ) : (
        <ImportForm providers={options} prefill={prefill} />
      )}
    </div>
  );
}
