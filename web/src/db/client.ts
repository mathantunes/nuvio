import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Please configure it to point to your Supabase or local Postgres instance."
  );
}

const queryClient = postgres(connectionString);
export const db = drizzle({ client: queryClient, schema });
