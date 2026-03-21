import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";
import { db } from "@/db/client";
import { budgets, budgetLines, categories, profiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { PlanningTabs } from "./planning-tabs";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetPlanningPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  if (!Number.isInteger(year)) {
    redirect("/app");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      and(
        eq(budgetLines.categoryId, categories.id),
        eq(categories.userId, user.id)
      )
    )
    .where(eq(budgetLines.budgetId, budget.id))
    .orderBy(budgetLines.month);

  // Separate into income and expense
  const incomeLines = allBudgetLines.filter(
    (line) => line.category.kind === "income"
  );
  const expenseLines = allBudgetLines.filter(
    (line) => line.category.kind === "expense" || line.category.kind === null
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Planning
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Define your {year} budget: income and expenses per month. Categories are
          created automatically when you add your first budget line.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-950">
        <PlanningTabs
          budgetId={budget.id}
          year={year}
          incomeLines={incomeLines}
          expenseLines={expenseLines}
          baseCurrency={baseCurrency}
        />
      </div>
    </div>
  );
}
