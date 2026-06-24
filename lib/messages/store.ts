import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageTemplates, type MessageTemplate } from "@/lib/db/schema";
import { DEFAULT_TEMPLATES } from "./defaults";

/** Inserts any default templates that are missing (covers first run + new builtins). */
export function seedTemplatesIfEmpty(): void {
  const existing = new Set(
    db.select({ key: messageTemplates.key }).from(messageTemplates).all().map((r) => r.key),
  );
  const missing = DEFAULT_TEMPLATES.filter((t) => !existing.has(t.key));
  if (missing.length === 0) return;
  db.insert(messageTemplates)
    .values(missing.map((t) => ({ ...t, builtin: true })))
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
