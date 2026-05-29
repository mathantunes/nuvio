import { db } from "@/db/client";
import { categories, budgetLines, accounts, transactions, budgets } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export type OnboardingCounts = {
  categoryCount: number;
  budgetLineCount: number;
  accountCount: number;
  transactionCount: number;
  budgetCount: number;
};

/**
 * Fetches all counts needed for onboarding tips and checklist in one round-trip.
 * Pass budgetId when available; budgetLineCount will be 0 if omitted.
 */
export async function getOnboardingCounts(
  userId: string,
  budgetId: string | null,
): Promise<OnboardingCounts> {
  const [
    [{ count: categoryCount }],
    [{ count: budgetLineCount }],
    [{ count: accountCount }],
    [{ count: transactionCount }],
    [{ count: budgetCount }],
  ] = await Promise.all([
    db.select({ count: count() }).from(categories).where(eq(categories.userId, userId)),
    budgetId
      ? db.select({ count: count() }).from(budgetLines).where(eq(budgetLines.budgetId, budgetId))
      : Promise.resolve([{ count: 0 }]),
    db.select({ count: count() }).from(accounts).where(eq(accounts.userId, userId)),
    db.select({ count: count() }).from(transactions).where(eq(transactions.userId, userId)),
    db.select({ count: count() }).from(budgets).where(eq(budgets.userId, userId)),
  ]);

  return {
    categoryCount: Number(categoryCount),
    budgetLineCount: Number(budgetLineCount),
    accountCount: Number(accountCount),
    transactionCount: Number(transactionCount),
    budgetCount: Number(budgetCount),
  };
}
