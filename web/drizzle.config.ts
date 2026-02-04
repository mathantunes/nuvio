import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Use DATABASE_URL when running drizzle-kit locally.
    url: process.env.DATABASE_URL ?? "",
  },
});

