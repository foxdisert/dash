import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { admin } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireAdmin();
  const users = db
    .select()
    .from(admin)
    .orderBy(asc(admin.id))
    .all()
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">🧑‍🤝‍🧑 Team</h1>
        <p className="text-sm text-ink/70">
          Add staff with limited access. <strong>Agents</strong> can see and
          contact clients and add/import them — but can't see credits, panel
          details, or create/renew subscriptions.
        </p>
      </header>
      <UsersClient users={users} currentUserId={Number(session.sub)} />
    </div>
  );
}
