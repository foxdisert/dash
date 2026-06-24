import { requireSession } from "@/lib/auth/guard";
import { getLeaderboard, type LeaderboardRow } from "@/lib/queries";
import { getPointValues } from "@/lib/points";
import { NBBadge, NBCard } from "@/components/ui";

export const dynamic = "force-dynamic";

const MEDAL = ["🥇", "🥈", "🥉"];

function Board({
  title,
  rows,
  meId,
}: {
  title: string;
  rows: LeaderboardRow[];
  meId: number;
}) {
  return (
    <NBCard>
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink/60">No points yet — get to work! 💪</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.agentId}
              className={`flex items-center gap-3 rounded-lg border-2 border-ink px-3 py-2 ${
                r.agentId === meId ? "bg-yellow" : i === 0 ? "bg-lime" : "bg-white"
              }`}
            >
              <span className="w-7 text-center text-lg font-bold">
                {MEDAL[i] ?? i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {r.name}
                  {r.agentId === meId && (
                    <span className="ml-1 text-xs text-ink/50">(you)</span>
                  )}
                </p>
                <p className="text-xs text-ink/60">
                  {r.onboard} onboarded · {r.retention} renewed · {r.outreach}{" "}
                  outreach
                </p>
              </div>
              <NBBadge color="pink">{r.points} pts</NBBadge>
            </li>
          ))}
        </ul>
      )}
    </NBCard>
  );
}

export default async function LeaderboardPage() {
  const session = await requireSession();
  const meId = Number(session.sub);
  const month = getLeaderboard("month");
  const all = getLeaderboard("all");
  const pv = getPointValues();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">🏆 Leaderboard</h1>
        <p className="text-sm text-ink/70">
          Earn points: <strong>onboard a client +{pv.onboard}</strong> ·{" "}
          <strong>a customer you own renews +{pv.retention}</strong> ·{" "}
          <strong>contact a client +{pv.outreach}</strong> (once/day each).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Board title="📅 This month" rows={month} meId={meId} />
        <Board title="⭐ All time" rows={all} meId={meId} />
      </div>
    </div>
  );
}
