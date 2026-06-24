"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { admin } from "@/lib/db/schema";
import { createSession, destroySession } from "./session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const row = db.select().from(admin).where(eq(admin.username, username)).get();
  if (!row || !bcrypt.compareSync(password, row.passwordHash)) {
    return { error: "Wrong username or password." };
  }

  await createSession({
    sub: String(row.id),
    username: row.username,
    role: row.role === "agent" ? "agent" : "admin",
  });
  redirect(row.role === "agent" ? "/clients" : "/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
