import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Profiles: per-user settings keyed 1:1 to auth.users.id.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // auth.users.id
  baseCurrency: text("base_currency").notNull().default("USD"),
  locale: text("locale").notNull().default("en-US"),
  timeZone: text("time_zone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Accounts: financial accounts owned by a user in a specific currency.
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  currencyCode: text("currency_code").notNull(),
  institution: text("institution"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

