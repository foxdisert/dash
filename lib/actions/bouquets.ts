"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bouquets } from "@/lib/db/schema";
import { clientForId } from "@/lib/providers";
import { ensureAdmin } from "@/lib/auth/guard";

export async function refreshBouquets(
  providerId: number,
): Promise<{ ok: boolean; message: string; count?: number }> {
  if (!(await ensureAdmin()))
    return { ok: false, message: "Not allowed — admin only." };
  try {
    const { client } = clientForId(providerId);
    const list = await client.getBouquets();

    db.delete(bouquets).where(eq(bouquets.providerId, providerId)).run();
    if (list.length > 0) {
      db.insert(bouquets)
        .values(
          list.map((b) => ({
            providerId,
            bouquetId: b.id,
            name: b.name,
          })),
        )
        .run();
    }

    revalidatePath("/bouquets");
    revalidatePath("/clients/new");
    return { ok: true, message: `Loaded ${list.length} bouquets.`, count: list.length };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to load bouquets.",
    };
  }
}

export async function getCachedBouquets(providerId: number) {
  return db
    .select()
    .from(bouquets)
    .where(eq(bouquets.providerId, providerId))
    .all();
}

export async function findBouquet(providerId: number, bouquetId: string) {
  return db
    .select()
    .from(bouquets)
    .where(
      and(eq(bouquets.providerId, providerId), eq(bouquets.bouquetId, bouquetId)),
    )
    .get();
}
