"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, clients } from "@/lib/db/schema";
import { clientForId } from "@/lib/providers";
import type { ClientType, DeviceLookupParams } from "@/lib/providers/types";
import { ensureAdmin } from "@/lib/auth/guard";
import { getSession } from "@/lib/auth/session";
import { markOrderConverted } from "@/lib/orders";
import { awardPoints } from "@/lib/points";

export type ActionResult = { ok: boolean; message: string };

const DENIED: ActionResult = {
  ok: false,
  message: "Not allowed — this needs an admin account.",
};

function err(e: unknown): string {
  return e instanceof Error ? e.message : "Request failed.";
}

/** Safely read current credits; returns null if it fails. */
async function safeCredits(providerId: number): Promise<number | null> {
  try {
    const { client } = clientForId(providerId);
    return (await client.getResellerInfo()).credits;
  } catch {
    return null;
  }
}

/** Add an existing client manually — no API call, spends no credits. */
export async function importClient(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const providerId = Number(formData.get("providerId"));
  const type = String(formData.get("type") ?? "m3u") as ClientType;
  const username = str(formData.get("username"));
  const password = str(formData.get("password"));
  const mac = str(formData.get("mac"));
  let expireDate = str(formData.get("expireDate"));
  const packageIds = str(formData.get("packageIds"));
  const note = str(formData.get("note"));
  const contact = readContact(formData);
  const orderId = Number(formData.get("orderId")) || null;
  const plan = str(formData.get("plan")) ?? null;
  const orderDate = str(formData.get("orderDate")) ?? null;

  // Active line with a known plan but no expiry typed → auto-calc from the plan.
  const planDays = planToDays(plan);
  if (!expireDate && (username || mac) && planDays) {
    expireDate = addDays(planDays);
  }

  // "Pending setup" = a customer captured without line credentials yet
  // (e.g. an agent who can't create panel lines). Admin provisions later.
  const isPending = !username && !mac;

  if (!providerId) return { ok: false, message: "Pick a provider." };
  if (isPending) {
    if (!contact.customerName && !contact.customerEmail)
      return { ok: false, message: "Add at least a customer name or email." };
  } else {
    if (type === "mag" && !mac)
      return { ok: false, message: "MAG lines need a MAC address." };
    if (type !== "mag" && !username)
      return { ok: false, message: "Username is required." };
  }

  try {
    // Agent who performs the import owns the client and earns onboarding points.
    const session = await getSession();
    const isAgent = session?.role === "agent";
    const actorId = session ? Number(session.sub) : null;

    const res = db
      .insert(clients)
      .values({
        providerId,
        type,
        username,
        password,
        mac,
        expireDate,
        packageIds,
        plan,
        orderDate,
        note,
        ...contact,
        assignedAgentId: isAgent ? actorId : null,
        source: "imported",
        status: isPending ? "pending" : "unknown",
      })
      .run();
    const newId = Number(res.lastInsertRowid);

    db.insert(activityLog)
      .values({
        providerId,
        clientId: newId,
        action: "import",
        message: isPending
          ? `Added customer ${contact.customerName ?? contact.customerEmail} (pending setup)`
          : `Imported ${type} ${username ?? mac}`,
      })
      .run();

    if (isAgent && actorId) {
      awardPoints(actorId, "onboard", {
        clientId: newId,
        note: orderId ? "Converted website order" : "Imported client",
      });
    }

    if (orderId) markOrderConverted(orderId, newId);

    revalidatePath("/clients");
    revalidatePath("/");
    revalidatePath("/orders");
    return {
      ok: true,
      message: isPending
        ? "Customer added — pending line setup by admin."
        : "Client imported.",
    };
  } catch (e) {
    return { ok: false, message: err(e) };
  }
}

/** Create a brand-new line on the provider — SPENDS CREDITS. */
export async function createClient(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const providerId = Number(formData.get("providerId"));
  const type = String(formData.get("type") ?? "m3u") as ClientType;
  const sub = Number(formData.get("sub"));
  const mac = str(formData.get("mac"));
  const note = str(formData.get("note"));
  const contact = readContact(formData);
  const orderId = Number(formData.get("orderId")) || null;
  const plan = str(formData.get("plan")) ?? null;
  const orderDate = str(formData.get("orderDate")) ?? null;
  const packs = formData.getAll("pack").map(String).filter(Boolean);
  const pack = packs.includes("all") || packs.length === 0 ? "all" : packs.join(",");

  if (!providerId) return { ok: false, message: "Pick a provider." };
  if (!sub) return { ok: false, message: "Pick a subscription length." };
  if (type === "mag" && !mac)
    return { ok: false, message: "MAG lines need a MAC address." };

  try {
    const before = await safeCredits(providerId);
    const { client } = clientForId(providerId);
    const result = await client.createClient({ type, sub, pack, mac, note });
    const after = await safeCredits(providerId);

    const expireDate = computeExpiry(sub);

    const ins = db
      .insert(clients)
      .values({
        providerId,
        type,
        username: result.username,
        password: result.password,
        mac: result.mac ?? mac,
        note,
        ...contact,
        packageIds: pack,
        plan: plan ?? (sub ? `${sub} month(s)` : null),
        orderDate,
        subMonths: sub,
        expireDate,
        url: result.url,
        userId: result.userId,
        status: "active",
        source: "created",
        lastSyncedAt: now(),
      })
      .run();

    db.insert(activityLog)
      .values({
        providerId,
        clientId: Number(ins.lastInsertRowid),
        action: "create",
        creditsBefore: before ?? undefined,
        creditsAfter: after ?? undefined,
        message: result.message,
      })
      .run();

    if (orderId) markOrderConverted(orderId, Number(ins.lastInsertRowid));

    revalidatePath("/clients");
    revalidatePath("/orders");
    revalidatePath("/");
    // Demo lines (sub 99) draw from the Demo Ticket pool, not credits.
    const cost =
      sub === 99
        ? " (1 demo ticket used)"
        : before != null && after != null
          ? ` (${before - after} credits used)`
          : "";
    return { ok: true, message: `${result.message}${cost}` };
  } catch (e) {
    return { ok: false, message: err(e) };
  }
}

/** Renew an existing client, then re-sync to capture the new expiry. */
export async function renewClient(
  clientId: number,
  sub: number,
): Promise<ActionResult> {
  if (!(await ensureAdmin())) return DENIED;
  const row = db.select().from(clients).where(eq(clients.id, clientId)).get();
  if (!row) return { ok: false, message: "Client not found." };

  try {
    const before = await safeCredits(row.providerId);
    const { client } = clientForId(row.providerId);
    const result = await client.renewClient({
      type: row.type as ClientType,
      sub,
      username: row.username ?? undefined,
      password: row.password ?? undefined,
      mac: row.mac ?? undefined,
    });
    const after = await safeCredits(row.providerId);

    db.insert(activityLog)
      .values({
        providerId: row.providerId,
        clientId,
        action: "renew",
        creditsBefore: before ?? undefined,
        creditsAfter: after ?? undefined,
        message: result.message,
      })
      .run();

    // Pull fresh expiry/status from the panel.
    await syncClient(clientId);

    revalidatePath("/clients");
    revalidatePath("/");
    return { ok: true, message: result.message };
  } catch (e) {
    return { ok: false, message: err(e) };
  }
}

/** Refresh one client's live status via device_info. No credits. */
export async function syncClient(clientId: number): Promise<ActionResult> {
  const row = db.select().from(clients).where(eq(clients.id, clientId)).get();
  if (!row) return { ok: false, message: "Client not found." };

  try {
    const { client } = clientForId(row.providerId);
    const lookup: DeviceLookupParams = {
      type: row.type as ClientType,
      username: row.username ?? undefined,
      password: row.password ?? undefined,
      mac: row.mac ?? undefined,
    };
    const info = await client.getDeviceInfo(lookup);

    db.update(clients)
      .set({
        expireDate: info.expire ?? row.expireDate,
        status: info.status,
        country: info.country ?? row.country,
        userId: info.userId ?? row.userId,
        url: info.url ?? row.url,
        password: info.password ?? row.password,
        lastSyncedAt: now(),
      })
      .where(eq(clients.id, clientId))
      .run();

    db.insert(activityLog)
      .values({
        providerId: row.providerId,
        clientId,
        action: "sync",
        message: `Status: ${info.status}${info.expire ? ` · expires ${info.expire}` : ""}`,
      })
      .run();

    revalidatePath("/clients");
    revalidatePath("/");
    return { ok: true, message: `Synced — ${info.status}.` };
  } catch (e) {
    return { ok: false, message: err(e) };
  }
}

/** Sync every client (optionally for one provider), throttled. */
export async function syncAll(providerId?: number): Promise<ActionResult> {
  const rows = providerId
    ? db.select().from(clients).where(eq(clients.providerId, providerId)).all()
    : db.select().from(clients).all();

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    const res = await syncClient(row.id);
    res.ok ? ok++ : failed++;
    await sleep(350); // throttle — rate limits are undocumented
  }
  revalidatePath("/clients");
  revalidatePath("/");
  return {
    ok: true,
    message: `Synced ${ok} client(s)${failed ? `, ${failed} failed` : ""}.`,
  };
}

export async function deleteClient(id: number): Promise<void> {
  await ensureAdmin(true); // throws ForbiddenError for non-admins
  db.delete(clients).where(eq(clients.id, id)).run();
  revalidatePath("/clients");
  revalidatePath("/");
}

/** Update a client's customer details / note (no provider call). */
export async function updateClientDetails(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Missing client id." };

  const contact = readContact(formData);
  // Owner reassignment + line provisioning are admin-only.
  const adminFields: Record<string, unknown> = {};
  if (await ensureAdmin()) {
    const ownerRaw = formData.get("assignedAgentId");
    if (ownerRaw != null) adminFields.assignedAgentId = Number(ownerRaw) || null;
    // Provision the line (only set fields that were filled — blanks keep current).
    const u = str(formData.get("username"));
    if (u) adminFields.username = u;
    const pw = str(formData.get("password"));
    if (pw) adminFields.password = pw;
    const m = str(formData.get("mac"));
    if (m) adminFields.mac = m;
    const ex = str(formData.get("expireDate"));
    if (ex) adminFields.expireDate = ex;
    const st = str(formData.get("status"));
    if (st) adminFields.status = st;

    // Activating a line with a plan but no expiry yet → auto-calc from the plan.
    if (adminFields.status === "active" && !adminFields.expireDate) {
      const cur = db.select().from(clients).where(eq(clients.id, id)).get();
      const days = planToDays(cur?.plan);
      if (cur && !cur.expireDate && days) adminFields.expireDate = addDays(days);
    }
  }
  try {
    db.update(clients)
      .set({
        note: str(formData.get("note")) ?? null,
        customerName: contact.customerName,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        ...adminFields,
      })
      .where(eq(clients.id, id))
      .run();

    revalidatePath("/clients");
    revalidatePath("/");
    return { ok: true, message: "Details saved." };
  } catch (e) {
    return { ok: false, message: err(e) };
  }
}

/* ---------------- helpers ---------------- */
function str(v: FormDataEntryValue | null): string | undefined {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? undefined : s;
}
/** Reads the customer contact fields from a form. */
function readContact(formData: FormData): {
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
} {
  return {
    customerName: str(formData.get("customerName")) ?? null,
    customerEmail: str(formData.get("customerEmail")) ?? null,
    customerPhone: str(formData.get("customerPhone")) ?? null,
  };
}
function now(): string {
  return new Date().toISOString();
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
/** Today + N days as YYYY-MM-DD. */
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Subscription length (months) → expiry from today. 1 month = 30 days, 99 = 1-day demo. */
function computeExpiry(subMonths: number): string {
  return addDays(subMonths === 99 ? 1 : subMonths * 30);
}

/**
 * Parses a plan label into a number of days.
 * 24H/1 day → 1, "X day(s)" → X, "X month(s)" → X*30, "X year"/annual → X*365.
 */
function planToDays(plan: string | null | undefined): number | null {
  if (!plan) return null;
  const p = plan.toLowerCase();
  if (/\b24\s*h/.test(p)) return 1;
  const day = p.match(/(\d+)\s*day/);
  if (day) return Number(day[1]);
  const year = p.match(/(\d+)\s*year/);
  if (year) return Number(year[1]) * 365;
  if (/\b(year|annual|yearly)\b/.test(p)) return 365;
  const month = p.match(/(\d+)\s*month/);
  if (month) return Number(month[1]) * 30;
  return null;
}
