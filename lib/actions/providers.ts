"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import {
  createProviderClient,
  getProviderKindMeta,
} from "@/lib/providers/registry";
import { clientForId } from "@/lib/providers";
import { ensureAdmin } from "@/lib/auth/guard";

export type ActionResult = { ok: boolean; message: string };

const DENIED: ActionResult = {
  ok: false,
  message: "Not allowed — this needs an admin account.",
};

export async function createProvider(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  let baseUrl = String(formData.get("baseUrl") ?? "").trim();

  const meta = getProviderKindMeta(kind);
  if (!meta) return { ok: false, message: "Unknown provider type." };
  if (!name) return { ok: false, message: "Give the provider a name." };
  if (!apiKey) return { ok: false, message: "API key is required." };
  if (!baseUrl) baseUrl = meta.defaultBaseUrl;

  db.insert(providers)
    .values({ name, kind, baseUrl, apiKeyEncrypted: encrypt(apiKey) })
    .run();

  revalidatePath("/providers");
  revalidatePath("/");
  return { ok: true, message: `Added “${name}”.` };
}

export async function updateProvider(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const enabled = formData.get("enabled") != null;

  if (!id) return { ok: false, message: "Missing provider id." };

  const patch: Record<string, unknown> = { name, baseUrl, enabled };
  // Only replace the key if a new one was typed.
  if (apiKey) patch.apiKeyEncrypted = encrypt(apiKey);

  db.update(providers).set(patch).where(eq(providers.id, id)).run();
  revalidatePath("/providers");
  revalidatePath("/");
  return { ok: true, message: "Saved." };
}

export async function deleteProvider(id: number): Promise<void> {
  await ensureAdmin(true);
  db.delete(providers).where(eq(providers.id, id)).run();
  revalidatePath("/providers");
  revalidatePath("/");
}

/** Tests an unsaved config (used in the add form). */
export async function testProviderConfig(
  kind: string,
  baseUrl: string,
  apiKey: string,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  try {
    const meta = getProviderKindMeta(kind);
    if (!meta) return { ok: false, message: "Unknown provider type." };
    const client = createProviderClient(kind, {
      baseUrl: baseUrl || meta.defaultBaseUrl,
      apiKey,
    });
    const info = await client.getResellerInfo();
    return {
      ok: true,
      message: `Connected as “${info.username}” — ${info.credits} credits.`,
    };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

/** Tests an already-saved provider by id. */
export async function testProvider(id: number): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  try {
    const { client } = clientForId(id);
    const info = await client.getResellerInfo();
    return {
      ok: true,
      message: `Connected as “${info.username}” — ${info.credits} credits.`,
    };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "Request failed.";
}
