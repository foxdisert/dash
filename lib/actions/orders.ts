"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { ensureAdmin } from "@/lib/auth/guard";

export type ActionResult = { ok: boolean; message: string };

const DENIED: ActionResult = { ok: false, message: "Not allowed — admin only." };

export async function setOrderStatus(
  id: number,
  status: "new" | "converted" | "ignored",
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  db.update(orders).set({ status }).where(eq(orders.id, id)).run();
  revalidatePath("/orders");
  revalidatePath("/", "layout");
  return { ok: true, message: status === "ignored" ? "Order ignored." : "Order updated." };
}
