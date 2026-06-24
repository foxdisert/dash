"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NBBadge } from "@/components/ui";
import { renewClient, syncClient } from "@/lib/actions/clients";
import { useToast } from "@/components/Toast";
import type { ExpiringNotification } from "@/lib/queries";

const STORE_KEY = "morsar_dismissed_notifs";
const keyOf = (it: ExpiringNotification) => `${it.id}:${it.expireDate ?? ""}`;

export function NotificationBell({
  items,
  canRenew = true,
}: {
  items: ExpiringNotification[];
  canRenew?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load dismissed keys from localStorage after mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const visible = useMemo(
    () => items.filter((it) => !dismissed.has(keyOf(it))),
    [items, dismissed],
  );
  const count = visible.length;

  function persist(next: Set<string>) {
    setDismissed(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  function clearAll() {
    const next = new Set(dismissed);
    visible.forEach((it) => next.add(keyOf(it)));
    persist(next);
    setOpen(false);
  }

  async function onSync(id: number) {
    setBusyId(id);
    const res = await syncClient(id);
    toast.result(res);
    setBusyId(null);
    router.refresh();
  }

  async function onRenew(id: number, label: string) {
    if (!confirm(`Renew “${label}” for 1 month? This spends credits.`)) return;
    setBusyId(id);
    const res = await renewClient(id, 1);
    toast.result(res);
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
          <div className="absolute left-0 z-20 mt-2 w-72 max-w-[90vw] rounded-xl border-[3px] border-ink bg-white p-3 shadow-[6px_6px_0_0_#131313] md:left-auto md:right-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-bold">⏳ Expiring in 7 days</p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-bold underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {count === 0 ? (
              <p className="py-4 text-center text-sm text-ink/60">
                Nothing expiring. 🎉
              </p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-auto">
                {visible.map((it) => (
                  <li key={it.id} className="rounded-lg border-2 border-ink p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{it.label}</span>
                      <NBBadge color={it.days <= 1 ? "red" : "yellow"}>
                        {it.days === 0 ? "today" : `${it.days}d`}
                      </NBBadge>
                    </div>
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

            <Link
              href="/clients?filter=expiring"
              onClick={() => setOpen(false)}
              className="mt-3 block text-center text-xs font-bold underline"
            >
              View all in Clients →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
