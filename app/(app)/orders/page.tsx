import { requireAdmin } from "@/lib/auth/guard";
import { getOrders } from "@/lib/queries";
import { OrdersClient, type OrderRow } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireAdmin();
  const rows: OrderRow[] = getOrders().map((o) => ({
    id: o.id,
    externalId: o.externalId,
    submittedAt: o.submittedAt,
    fullName: o.fullName,
    whatsapp: o.whatsapp,
    email: o.email,
    planLabel: o.planLabel,
    connections: o.connections,
    amount: o.amount,
    currency: o.currency,
    paymentStatus: o.paymentStatus,
    paymentMode: o.paymentMode,
    transactionId: o.transactionId,
    status: o.status as OrderRow["status"],
    clientId: o.clientId,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">🛒 Orders</h1>
        <p className="text-sm text-ink/70">
          Paid orders from your website. Review, then convert to a client.
        </p>
      </header>
      <OrdersClient rows={rows} />
    </div>
  );
}
