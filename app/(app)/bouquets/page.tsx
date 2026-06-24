import { db } from "@/lib/db";
import { bouquets, providers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { BouquetsClient } from "./BouquetsClient";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function BouquetsPage() {
  await requireAdmin();
  const provs = db.select().from(providers).all();
  const data = provs.map((p) => ({
    id: p.id,
    name: p.name,
    enabled: p.enabled,
    bouquets: db
      .select()
      .from(bouquets)
      .where(eq(bouquets.providerId, p.id))
      .all()
      .map((b) => ({ id: b.bouquetId, name: b.name })),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">📦 Bouquets</h1>
        <p className="text-sm text-ink/70">
          Packages available on each provider. Refresh to pull the latest list.
        </p>
      </header>
      <BouquetsClient providers={data} />
    </div>
  );
}
