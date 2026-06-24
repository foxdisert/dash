import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageTemplates, type MessageTemplate } from "@/lib/db/schema";
import { DEFAULT_TEMPLATES } from "./defaults";

/** Inserts default templates if the table is empty (safety net for first run). */
export function seedTemplatesIfEmpty(): void {
  const count = db
    .select({ n: sql<number>`count(*)` })
    .from(messageTemplates)
    .get();
  if (count && count.n > 0) return;
  db.insert(messageTemplates)
    .values(DEFAULT_TEMPLATES.map((t) => ({ ...t, builtin: true })))
    .run();
}

export function listTemplates(): MessageTemplate[] {
  seedTemplatesIfEmpty();
  return db
    .select()
    .from(messageTemplates)
    .orderBy(asc(messageTemplates.id))
    .all();
}

export function getTemplate(key: string): MessageTemplate | undefined {
  return db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.key, key))
    .get();
}

export function updateTemplate(
  id: number,
  patch: { name: string; subject: string; body: string; channel: string },
): void {
  db.update(messageTemplates)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(messageTemplates.id, id))
    .run();
}
