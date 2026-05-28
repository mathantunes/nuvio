import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { budgets, budgetLines, categories, profiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { PlanningTabs } from "./planning-tabs";
import { AuthService } from "@/lib/auth-service";
import { Card } from "@/components/ui";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetPlanningPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  if (!Number.isInteger(year)) {
    redirect("/app");
  }

  const user = await AuthService.getCurrentUser();

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
  });

  if (!budget) {
    redirect("/app");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const baseCurrency = profile?.baseCurrency ?? "USD";

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

  const incomeLines = allBudgetLines.filter(
    (line) => line.category.kind === "income"
  );
  const expenseLines = allBudgetLines.filter(
    (line) => line.category.kind === "expense" || line.category.kind === null
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Planning
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Define your {year} budget: income and expenses per month. Categories are
          created automatically when you add your first budget line.
        </p>
      </header>

      <Card className="text-left">
        <PlanningTabs
          budgetId={budget.id}
          year={year}
          incomeLines={incomeLines}
          expenseLines={expenseLines}
          baseCurrency={baseCurrency}
        />
      </Card>
    </div>
  );
}
