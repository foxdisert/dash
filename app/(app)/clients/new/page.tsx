import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bouquets, providers } from "@/lib/db/schema";
import { getProviderKindMeta } from "@/lib/providers/registry";
import { NBCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/guard";
import { getOrder } from "@/lib/queries";
import { orderPrefill } from "@/lib/orders";
import { NewClientForm, type ProviderOption } from "./NewClientForm";

export const dynamic = "force-dynamic";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  await requireAdmin();
  const { orderId } = await searchParams;
  const order = orderId ? getOrder(Number(orderId)) : undefined;
  const prefill = order ? orderPrefill(order) : undefined;
  const provs = db.select().from(providers).where(eq(providers.enabled, true)).all();

  const options: ProviderOption[] = provs.map((p) => {
    const meta = getProviderKindMeta(p.kind);
    return {
      id: p.id,
      name: p.name,
      supportedTypes: meta?.supportedTypes ?? ["m3u"],
      subOptions: meta?.subOptions ?? {
        m3u: [1, 3, 6, 12],
        mag: [1, 3, 6, 12],
        protocol: [1, 3, 6, 12],
      },
      bouquets: db
        .select()
        .from(bouquets)
        .where(eq(bouquets.providerId, p.id))
        .all()
        .map((b) => ({ id: b.bouquetId, name: b.name })),
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">➕ New line</h1>
          <p className="text-sm text-ink/70">
            Creates a real line on the provider — this{" "}
            <strong>spends credits</strong>.
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
          <p className="font-bold">No enabled providers.</p>
          <Link href="/providers" className="nb-btn mt-2 bg-cyan text-white">
            Add a provider
          </Link>
        </NBCard>
      ) : (
        <NewClientForm providers={options} prefill={prefill} />
      )}
    </div>
  );
}
