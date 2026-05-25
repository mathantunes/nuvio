import { redirect } from "next/navigation";

import { AuthService } from "@/lib/auth-service";
import { db } from "@/db/client";
import {
  budgets,
  budgetLines,
  categories,
  profiles,
  transactions,
  accounts,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { TrackingTabs } from "../tracking-tabs";

type Props = {
  params: Promise<{ year: string; month: string }>;
};

export default async function BudgetTrackingMonthPage({ params }: Props) {
  const { year: yearString, month: monthString } = await params;
  const year = Number(yearString);
  const selectedMonth = Number(monthString);

  if (!Number.isInteger(year)) {
    redirect("/app");
  }

  if (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
    const now = new Date();
    const fallbackMonth = now.getFullYear() === year ? now.getMonth() + 1 : 1;
    redirect(`/app/${year}/tracking/${fallbackMonth}`);
  }

  const user = await AuthService.getCurrentUser();

  // Get budget
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
  });

  if (!budget) {
    redirect("/app");
  }

  // Get profile for base currency
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const baseCurrency = profile?.baseCurrency ?? "USD";

  // Get all budget lines for this budget with categories
  const allBudgetLines = await db
    .select({
      id: budgetLines.id,
      categoryId: budgetLines.categoryId,
      month: budgetLines.month,
      plannedAmount: budgetLines.plannedAmount,
      currencyCode: budgetLines.currencyCode,
      notes: budgetLines.notes,
      category: {
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
      },
    })
    .from(budgetLines)
    .innerJoin(
      categories,
      and(eq(budgetLines.categoryId, categories.id), eq(categories.userId, user.id))
    )
    .where(eq(budgetLines.budgetId, budget.id))
    .orderBy(budgetLines.month);

  // Separate into income and expense
  const incomeLines = allBudgetLines.filter((line) => line.category.kind === "income");
  const expenseLines = allBudgetLines.filter(
    (line) => line.category.kind === "expense" || line.category.kind === null
  );

  // Get transactions for this budget year
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const allTransactions = await db
    .select({
      id: transactions.id,
      budgetLineId: transactions.budgetLineId,
      amount: transactions.amount,
      currencyCode: transactions.currencyCode,
      occurredAt: transactions.occurredAt,
      description: transactions.description,
      account: {
        id: accounts.id,
        name: accounts.name,
      },
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.userId, user.id));

  const yearTransactions = allTransactions.filter((tx) => {
    const txDate = new Date(tx.occurredAt);
    return txDate >= startOfYear && txDate <= endOfYear;
  });

  // Get user accounts
  const userAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      currencyCode: accounts.currencyCode,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true)));

  // Get all user categories split by kind for the unplanned form
  const allCategories = await db
    .select({ id: categories.id, name: categories.name, kind: categories.kind })
    .from(categories)
    .where(eq(categories.userId, user.id));

  const incomeCategories = allCategories.filter((c) => c.kind === "income");
  const expenseCategories = allCategories.filter(
    (c) => c.kind === "expense" || c.kind === null
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Tracking
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Compare your actual {year} income and expenses against your plan. Add
          transactions to track progress throughout the year.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-800 dark:bg-zinc-950">
        <TrackingTabs
          budgetId={budget.id}
          year={year}
          selectedMonth={selectedMonth}
          incomeLines={incomeLines}
          expenseLines={expenseLines}
          transactions={yearTransactions}
          accounts={userAccounts}
          baseCurrency={baseCurrency}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
        />
      </div>
    </div>
  );
}

