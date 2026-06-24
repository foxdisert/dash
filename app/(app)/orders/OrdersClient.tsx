"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NBBadge, NBButton, NBCard, NBSelect } from "@/components/ui";
import { setOrderStatus } from "@/lib/actions/orders";
import { useToast } from "@/components/Toast";

export type OrderRow = {
  id: number;
  externalId: string | null;
  submittedAt: string | null;
  fullName: string | null;
  whatsapp: string | null;
  email: string | null;
  planLabel: string | null;
  connections: number | null;
  amount: string | null;
  currency: string | null;
  paymentStatus: string | null;
  paymentMode: string | null;
  transactionId: string | null;
  status: "new" | "converted" | "ignored";
  clientId: number | null;
};

const STATUS_COLOR: Record<OrderRow["status"], "yellow" | "lime" | "white"> = {
  new: "yellow",
  converted: "lime",
  ignored: "white",
};

export function OrdersClient({ rows }: { rows: OrderRow[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const newCount = rows.filter((r) => r.status === "new").length;

  if (rows.length === 0) {
    return (
      <NBCard className="bg-blue/30">
        <p className="font-bold">No orders yet.</p>
        <p className="text-sm">
          Once your website posts an order to the webhook, it shows up here. Set
          it up under{" "}
          <Link href="/settings" className="underline">
            Settings → Website orders
          </Link>
          .
        </p>
      </NBCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <NBSelect
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-48"
        >
          <option value="all">All ({rows.length})</option>
          <option value="new">New ({newCount})</option>
          <option value="converted">Converted</option>
          <option value="ignored">Ignored</option>
        </NBSelect>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-ink/15 py-1 text-sm last:border-0">
      <span className="text-ink/60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function ignore(status: "ignored" | "new") {
    setBusy(true);
    const res = await setOrderStatus(order.id, status);
    toast.result(res);
    setBusy(false);
    router.refresh();
  }

  const paid = (order.paymentStatus ?? "").toUpperCase() === "COMPLETED";

  return (
    <NBCard>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-bold">
          {order.fullName ?? "Unknown"}
          {order.externalId && (
            <span className="ml-2 text-xs text-ink/40">#{order.externalId}</span>
          )}
        </span>
        <div className="flex gap-1">
          <NBBadge color={paid ? "lime" : "yellow"}>
            {order.paymentStatus ?? "—"}
          </NBBadge>
          <NBBadge color={STATUS_COLOR[order.status]}>{order.status}</NBBadge>
        </div>
      </div>

      <div className="mb-3">
        <Row label="Plan" value={order.planLabel} />
        <Row label="Connections" value={order.connections} />
        <Row
          label="Amount"
          value={
            order.amount ? `${order.amount} ${order.currency ?? ""}`.trim() : null
          }
        />
        <Row
          label="WhatsApp"
          value={
            order.whatsapp ? (
              <a
                href={`https://wa.me/${order.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {order.whatsapp}
              </a>
            ) : null
          }
        />
        <Row
          label="Email"
          value={
            order.email ? (
              <a href={`mailto:${order.email}`} className="underline">
                {order.email}
              </a>
            ) : null
          }
        />
        <Row label="Txn" value={order.transactionId} />
        <Row label="Mode" value={order.paymentMode} />
        <Row label="Submitted" value={order.submittedAt} />
      </div>

      {order.status === "converted" ? (
        <div className="flex items-center gap-2">
          <NBBadge color="lime">✓ converted</NBBadge>
          {order.clientId && (
            <Link href="/clients" className="text-sm font-bold underline">
              View in clients →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/clients/new?orderId=${order.id}`}
            className="nb-btn bg-lime"
          >
            ➕ New line
          </Link>
          <Link
            href={`/clients/import?orderId=${order.id}`}
            className="nb-btn bg-blue"
          >
            📥 Import
          </Link>
          {order.status === "ignored" ? (
            <NBButton onClick={() => ignore("new")} disabled={busy}>
              ↩︎ Un-ignore
            </NBButton>
          ) : (
            <NBButton onClick={() => ignore("ignored")} disabled={busy}>
              🚫 Ignore
            </NBButton>
          )}
        </div>
      )}
    </NBCard>
  );
}
