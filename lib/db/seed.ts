import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { admin, messageTemplates } from "./schema";
import { DEFAULT_TEMPLATES } from "../messages/defaults";

const dbPath = process.env.DATABASE_PATH || "./data/morsardash.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

const password = process.env.ADMIN_PASSWORD || "changeme";

const existing = db.all(sql`SELECT id FROM admin LIMIT 1`);
if (existing.length > 0) {
  console.log("✓ Admin already exists — skipping admin seed.");
} else {
  const hash = bcrypt.hashSync(password, 10);
  db.insert(admin).values({ username: "admin", passwordHash: hash }).run();
  console.log(
    `✓ Admin created (username: admin, password: from ADMIN_PASSWORD env).`,
  );
}

// Seed message templates if none exist.
const tplCount = db.all(sql`SELECT id FROM message_templates LIMIT 1`);
if (tplCount.length > 0) {
  console.log("✓ Templates already exist — skipping template seed.");
} else {
  db.insert(messageTemplates)
    .values(DEFAULT_TEMPLATES.map((t) => ({ ...t, builtin: true })))
    .run();
  console.log(`✓ Seeded ${DEFAULT_TEMPLATES.length} message templates.`);
}

sqlite.close();
