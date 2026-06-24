import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { listProviderKinds } from "@/lib/providers/registry";
import { ProvidersClient } from "./ProvidersClient";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  await requireAdmin();
  const rows = db.select().from(providers).orderBy(desc(providers.id)).all();
  const kinds = listProviderKinds();

  const safeRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    baseUrl: r.baseUrl,
    enabled: r.enabled,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">🔌 Providers</h1>
        <p className="text-sm text-ink/70">
          Connect IPTV panels. Add as many as you like — each client is tied to
          the provider it lives on.
        </p>
      </header>
      <ProvidersClient providers={safeRows} kinds={kinds} />
    </div>
  );
}
