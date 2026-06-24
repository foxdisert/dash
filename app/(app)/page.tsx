import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { NBBadge, NBButton, NBCard } from "@/components/ui";
import {
  getClientStats,
  getExpiringSoon,
  getProviderCredits,
  getProviderName,
  getRecentActivity,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const ACTION_ICON: Record<string, string> = {
  create: "➕",
  renew: "🔄",
  sync: "📡",
  import: "📥",
  test: "🔌",
};

export default async function DashboardPage() {
  await requireAdmin();
  const [credits, stats, expiring, activity] = await Promise.all([
    getProviderCredits(),
    Promise.resolve(getClientStats()),
    Promise.resolve(getExpiringSoon(7)),
    Promise.resolve(getRecentActivity(8)),
  ]);

  const totalCredits = credits
    .filter((c) => c.ok)
    .reduce((sum, c) => sum + (c.credits ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">📊 Overview</h1>
          <p className="text-sm text-ink/70">Your IPTV business at a glance.</p>
        </div>
        <Link href="/clients/new" className="nb-btn bg-lime">
          ➕ New line
        </Link>
      </header>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total credits" value={totalCredits} bg="bg-yellow" />
        <Stat label="Clients" value={stats.total} bg="bg-pink" />
        <Stat label="Active" value={stats.active} bg="bg-lime" />
        <Stat
          label="Expired"
          value={stats.expired + stats.disabled}
          bg="bg-blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Credits per provider */}
        <NBCard>
          <h2 className="mb-3 text-xl font-bold">💳 Credits by provider</h2>
          {credits.length === 0 ? (
            <EmptyHint
              text="No providers connected yet."
              href="/providers"
              cta="Add a provider"
            />
          ) : (
            <ul className="space-y-2">
              {credits.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border-2 border-ink px-3 py-2"
                >
                  <div>
                    <p className="font-bold">{c.name}</p>
                    {c.ok ? (
                      <p className="text-xs text-ink/60">{c.username}</p>
                    ) : (
                      <p className="text-xs text-red">{c.error}</p>
                    )}
                  </div>
                  {c.ok ? (
                    <NBBadge color="yellow">{c.credits} cr</NBBadge>
                  ) : (
                    <NBBadge color="red">offline</NBBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </NBCard>

        {/* Expiring soon */}
        <NBCard>
          <h2 className="mb-3 text-xl font-bold">⏳ Expiring in 7 days</h2>
          {expiring.length === 0 ? (
            <p className="text-sm text-ink/60">Nothing expiring soon. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {expiring.slice(0, 8).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border-2 border-ink px-3 py-2"
                >
                  <span className="truncate font-bold">
                    {c.username ?? c.mac}
                  </span>
                  <NBBadge color={c.days! <= 2 ? "red" : "yellow"}>
                    {c.days === 0 ? "today" : `${c.days}d`}
                  </NBBadge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/clients?filter=expiring"
            className="mt-3 inline-block text-sm font-bold underline"
          >
            View all clients →
          </Link>
        </NBCard>
      </div>

      {/* Recent activity */}
      <NBCard>
        <h2 className="mb-3 text-xl font-bold">🕒 Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-ink/60">No activity yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 border-b border-dashed border-ink/20 py-1.5 last:border-0"
              >
                <span>{ACTION_ICON[a.action] ?? "•"}</span>
                <span className="font-bold capitalize">{a.action}</span>
                <span className="truncate text-ink/70">{a.message}</span>
                <span className="ml-auto shrink-0 text-xs text-ink/50">
                  {getProviderName(a.providerId)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </NBCard>
    </div>
  );
}

function Stat({
  label,
  value,
  bg,
}: {
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <NBCard className={bg}>
      <p className="text-sm font-bold opacity-70">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </NBCard>
  );
}

function EmptyHint({
  text,
  href,
  cta,
}: {
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="text-sm">
      <p className="mb-2 text-ink/60">{text}</p>
      <Link href={href} className="nb-btn bg-cyan text-white">
        {cta}
      </Link>
    </div>
  );
}
