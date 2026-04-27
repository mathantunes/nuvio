/**
 * One-time migration: creates a local user row with the same UUID
 * that already exists in the profiles table, preserving all existing data.
 *
 * Usage:
 *   npx tsx scripts/create-initial-user.ts you@example.com yourpassword
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error(
      "Usage: npx tsx scripts/create-initial-user.ts <email> <password>"
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle({ client, schema });

  // Derive the canonical user UUID: prefer an existing user, then an existing
  // profile, then any user_id from the data tables, finally generate a fresh one.
  let existingId: string | undefined;

  const existingUsers = await db.select().from(schema.users).limit(1);
  if (existingUsers.length > 0) {
    existingId = existingUsers[0].id;
    console.log(`Found existing user row with id=${existingId} — updating credentials.`);
    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(schema.users)
      .set({ email, passwordHash })
      .where(sql`id = ${existingId}::uuid`);
    console.log(`✓ User updated: email=${email}`);
    await client.end();
    return;
  }

  const profiles = await db.select().from(schema.profiles).limit(1);
  if (profiles.length > 0) {
    existingId = profiles[0].id;
  } else {
    // Try to find a user_id from any data table.
    const rows = await client`SELECT user_id FROM accounts LIMIT 1`;
    if (rows.length > 0) {
      existingId = rows[0].user_id as string;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existingId) {
    await db.insert(schema.users).values({ id: existingId, email, passwordHash });
    // Ensure a matching profile row exists.
    await db
      .insert(schema.profiles)
      .values({ id: existingId })
      .onConflictDoNothing();
    console.log(`✓ User created with id=${existingId} and email=${email}`);
  } else {
    // Completely fresh install — let Postgres generate the UUID.
    const [newUser] = await db
      .insert(schema.users)
      .values({ email, passwordHash })
      .returning();
    await db.insert(schema.profiles).values({ id: newUser.id }).onConflictDoNothing();
    console.log(`✓ New user created with id=${newUser.id} and email=${email}`);
  }

  console.log(
    "  All existing data (accounts, budgets, transactions, etc.) is preserved."
  );
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
