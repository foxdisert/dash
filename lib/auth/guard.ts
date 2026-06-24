import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

/** For use in server components / pages — redirects to /login if no session. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function isAdmin(session: SessionPayload | null): boolean {
  return session?.role === "admin";
}

/** Page guard: requires an admin session, else redirect (agents → /clients). */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/clients");
  return session;
}

/** Thrown by server actions when a non-admin attempts an admin-only action. */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden: this action requires an admin account.");
    this.name = "ForbiddenError";
  }
}

/**
 * Authoritative guard for admin-only server actions. Returns true if admin.
 * If `throwOnDeny` is true, throws ForbiddenError instead of returning false.
 */
export async function ensureAdmin(throwOnDeny = false): Promise<boolean> {
  const session = await getSession();
  if (session?.role === "admin") return true;
  if (throwOnDeny) throw new ForbiddenError();
  return false;
}
