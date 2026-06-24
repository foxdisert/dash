"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NBBadge } from "@/components/ui";
import { renewClient, syncClient } from "@/lib/actions/clients";
import type { ExpiringNotification } from "@/lib/queries";

export function NotificationBell({
  items,
  canRenew = true,
}: {
  items: ExpiringNotification[];
  canRenew?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const count = items.length;

  async function onSync(id: number) {
    setBusyId(id);
    await syncClient(id);
    setBusyId(null);
    router.refresh();
  }

  async function onRenew(id: number, label: string) {
    if (!confirm(`Renew “${label}” for 1 month? This spends credits.`)) return;
    setBusyId(id);
    await renewClient(id, 1);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="nb-btn relative bg-white px-3"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-red text-xs font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-80 max-w-[90vw] rounded-xl border-[3px] border-ink bg-white p-3 shadow-[6px_6px_0_0_#131313] md:left-auto md:right-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">⏳ Expiring soon</p>
              <Link
                href="/clients?filter=expiring"
                onClick={() => setOpen(false)}
                className="text-xs font-bold underline"
              >
                View all
              </Link>
            </div>

            {count === 0 ? (
              <p className="py-4 text-center text-sm text-ink/60">
                Nothing expiring. 🎉
              </p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-auto">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="rounded-lg border-2 border-ink p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{it.label}</span>
                      <NBBadge color={it.expired || it.days <= 1 ? "red" : "yellow"}>
                        {it.expired
                          ? "expired"
                          : it.days === 0
                            ? "today"
                            : `${it.days}d`}
                      </NBBadge>
                    </div>
                    <p className="text-xs text-ink/60">
                      {it.providerName}
                      {it.expireDate && ` · ${it.expireDate}`}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSync(it.id)}
                        disabled={busyId === it.id}
                        className="nb-btn flex-1 bg-cyan px-2 py-1 text-xs text-white"
                      >
                        {busyId === it.id ? "…" : "📡 Sync"}
                      </button>
                      {canRenew && (
                        <button
                          type="button"
                          onClick={() => onRenew(it.id, it.label)}
                          disabled={busyId === it.id}
                          className="nb-btn flex-1 bg-lime px-2 py-1 text-xs"
                        >
                          🔄 Renew 1mo
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
