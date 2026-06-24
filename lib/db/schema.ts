import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Providers — each row is one upstream IPTV panel (Dino, etc.). */
export const providers = sqliteTable("providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // matches a key in the provider registry, e.g. "tvpluspanel"
  baseUrl: text("base_url").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/** Clients — every line we create or import, scoped to a provider. */
export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // m3u | mag | protocol
    username: text("username"),
    password: text("password"),
    mac: text("mac"),
    note: text("note"),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    country: text("country"),
    packageIds: text("package_ids"), // comma-separated bouquet ids, or "all"
    plan: text("plan"), // plan label, e.g. "12 Months Package Premium"
    orderDate: text("order_date"), // YYYY-MM-DD of the originating order
    subMonths: integer("sub_months"),
    expireDate: text("expire_date"), // YYYY-MM-DD
    status: text("status").notNull().default("unknown"), // active | expired | disabled | unknown
    source: text("source").notNull().default("created"), // created | imported
    userId: text("user_id"), // upstream user_id returned by the panel
    url: text("url"), // m3u url / portal url returned by the panel
    lastSyncedAt: text("last_synced_at"),
    lastReminderAt: text("last_reminder_at"), // last auto expiry-reminder email
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    providerUserIdx: uniqueIndex("clients_provider_user_idx").on(
      t.providerId,
      t.username,
      t.mac,
    ),
  }),
);

/** Cached bouquet/package list per provider. */
export const bouquets = sqliteTable(
  "bouquets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    bouquetId: text("bouquet_id").notNull(),
    name: text("name").notNull(),
    fetchedAt: text("fetched_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    providerBouquetIdx: uniqueIndex("bouquets_provider_bouquet_idx").on(
      t.providerId,
      t.bouquetId,
    ),
  }),
);

/** Activity log — create/renew/sync/import events with credit deltas. */
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id").references(() => providers.id, {
    onDelete: "set null",
  }),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(), // create | renew | sync | import | test
  creditsBefore: integer("credits_before"),
  creditsAfter: integer("credits_after"),
  message: text("message"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/** Incoming website orders (e.g. from a WordPress/Forminator + PayPal form). */
export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull().default("wordpress"),
    externalId: text("external_id"), // form entry # (e.g. "366")
    submittedAt: text("submitted_at"),
    fullName: text("full_name"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    planLabel: text("plan_label"),
    connections: integer("connections"),
    amount: text("amount"),
    currency: text("currency"),
    paymentStatus: text("payment_status"),
    paymentMode: text("payment_mode"),
    transactionId: text("transaction_id"),
    raw: text("raw"), // full JSON payload
    status: text("status").notNull().default("new"), // new | converted | ignored
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    txnIdx: uniqueIndex("orders_txn_idx").on(t.transactionId),
  }),
);

/** Editable message templates (email + WhatsApp), seeded with defaults. */
export const messageTemplates = sqliteTable("message_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  channel: text("channel").notNull().default("both"), // both | email | whatsapp
  subject: text("subject"),
  body: text("body").notNull(),
  builtin: integer("builtin", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/** Key-value app settings (Telegram config, notify threshold, etc.). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/** User accounts (admin + agents). */
export const admin = sqliteTable("admin", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().default("admin"),
  displayName: text("display_name"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // admin | agent
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type User = typeof admin.$inferSelect;

export type Provider = typeof providers.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Bouquet = typeof bouquets.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type Order = typeof orders.$inferSelect;
