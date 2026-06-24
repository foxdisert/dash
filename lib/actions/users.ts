"use server";

import { revalidatePath } from "next/cache";
import { eq, ne, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { admin } from "@/lib/db/schema";
import { ensureAdmin } from "@/lib/auth/guard";
import { getSession } from "@/lib/auth/session";

export type ActionResult = { ok: boolean; message: string };

const DENIED: ActionResult = { ok: false, message: "Not allowed — admin only." };

export async function createUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "agent";

  if (!username || !password)
    return { ok: false, message: "Username and password are required." };
  if (password.length < 6)
    return { ok: false, message: "Password must be at least 6 characters." };

  const existing = db.select().from(admin).where(eq(admin.username, username)).get();
  if (existing) return { ok: false, message: "That username is taken." };

  db.insert(admin)
    .values({
      username,
      displayName: displayName || null,
      passwordHash: bcrypt.hashSync(password, 10),
      role,
    })
    .run();

  revalidatePath("/users");
  return { ok: true, message: `Added ${role} “${username}”.` };
}

export async function resetPassword(
  userId: number,
  newPassword: string,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  if (!newPassword || newPassword.length < 6)
    return { ok: false, message: "Password must be at least 6 characters." };

  db.update(admin)
    .set({ passwordHash: bcrypt.hashSync(newPassword, 10) })
    .where(eq(admin.id, userId))
    .run();

  revalidatePath("/users");
  return { ok: true, message: "Password updated." };
}

export async function deleteUser(userId: number): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;

  const session = await getSession();
  if (session && Number(session.sub) === userId)
    return { ok: false, message: "You can't delete your own account." };

  const target = db.select().from(admin).where(eq(admin.id, userId)).get();
  if (!target) return { ok: false, message: "User not found." };

  // Don't allow removing the last admin.
  if (target.role === "admin") {
    const otherAdmins = db
      .select()
      .from(admin)
      .where(and(eq(admin.role, "admin"), ne(admin.id, userId)))
      .all();
    if (otherAdmins.length === 0)
      return { ok: false, message: "Can't delete the last admin." };
  }

  db.delete(admin).where(eq(admin.id, userId)).run();
  revalidatePath("/users");
  return { ok: true, message: `Deleted “${target.username}”.` };
}
