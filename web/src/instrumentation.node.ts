import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db/client";
import path from "path";

export async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  try {
    await migrate(db, { migrationsFolder });
    console.log("[nuvio] Database migrations applied successfully.");
  } catch (err) {
    console.error("[nuvio] Database migration failed:", err);
    // Do not throw — let the app start so the error is visible in logs.
  }
}
