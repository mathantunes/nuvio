import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../web/src/db/schema.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const sqlClient = postgres(databaseUrl);
export const db = drizzle(sqlClient, { schema });
export { schema };
export const {
  profiles,
  accounts,
  transactionTypeValues,
  categories,
  budgets,
  budgetLines,
  fxRates,
  transactions,
  transfers,
  savingsSnapshots,
  savingsSnapshotLines,
  investmentPositions,
  investmentValuations,
  investmentFlows,
  instrumentTransfers,
  assets,
  assetValuations,
  loans,
  loanAmortizations,
  loanPayments,
  users,
} = schema;
